import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import {
  GetLearningProfileResponse,
  LearningProfileDto,
  PatchLearningProfileResponse,
} from "@ai-voice-assistant/shared";
import { DataSource } from "typeorm";
import { PatchLearningProfileDto } from "./dto/patch-learning-profile.dto";

interface LearningProfileRow {
  goal_text: string;
  current_level_text: string;
  weekly_time_minutes: number;
  user_declared_weak_points: string[];
  derived_weak_points: string[];
  recent_topics: string[];
  preferred_response_style: string | null;
  progress_notes: string | null;
}

@Injectable()
export class LearningProfileService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getLearningProfile(userId: string): Promise<GetLearningProfileResponse> {
    const rows = await this.dataSource.query<LearningProfileRow[]>(
      `
        SELECT
          goal_text,
          current_level_text,
          weekly_time_minutes,
          user_declared_weak_points,
          derived_weak_points,
          recent_topics,
          preferred_response_style,
          progress_notes
        FROM learning_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId],
    );

    return {
      profile: rows[0] ? this.mapLearningProfile(rows[0]) : null,
    };
  }

  async patchLearningProfile(
    userId: string,
    body: PatchLearningProfileDto,
  ): Promise<PatchLearningProfileResponse> {
    const normalizedWeakPoints = Array.from(
      new Set(body.userDeclaredWeakPoints.map((item) => item.trim()).filter(Boolean)),
    );

    const profile = await this.dataSource.transaction(async (transactionalEntityManager) => {
      const rows = await transactionalEntityManager.query<LearningProfileRow[]>(
        `
          INSERT INTO learning_profiles (
            user_id,
            goal_text,
            current_level_text,
            weekly_time_minutes,
            user_declared_weak_points,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5::text[], NOW())
          ON CONFLICT (user_id)
          DO UPDATE
          SET
            goal_text = EXCLUDED.goal_text,
            current_level_text = EXCLUDED.current_level_text,
            weekly_time_minutes = EXCLUDED.weekly_time_minutes,
            user_declared_weak_points = EXCLUDED.user_declared_weak_points,
            updated_at = NOW()
          RETURNING
            goal_text,
            current_level_text,
            weekly_time_minutes,
            user_declared_weak_points,
            derived_weak_points,
            recent_topics,
            preferred_response_style,
            progress_notes
        `,
        [
          userId,
          body.goalText.trim(),
          body.currentLevelText.trim(),
          body.weeklyTimeMinutes,
          normalizedWeakPoints,
        ],
      );

      await transactionalEntityManager.query(
        `
          UPDATE users
          SET onboarding_completed = true, updated_at = NOW()
          WHERE id = $1
        `,
        [userId],
      );

      return rows[0];
    });

    return {
      profile: this.mapLearningProfile(profile),
    };
  }

  private mapLearningProfile(row: LearningProfileRow): LearningProfileDto {
    return {
      goalText: row.goal_text,
      currentLevelText: row.current_level_text,
      weeklyTimeMinutes: row.weekly_time_minutes,
      userDeclaredWeakPoints: row.user_declared_weak_points,
      derivedWeakPoints: row.derived_weak_points,
      recentTopics: row.recent_topics,
      preferredResponseStyle: row.preferred_response_style,
      progressNotes: row.progress_notes,
    };
  }
}
