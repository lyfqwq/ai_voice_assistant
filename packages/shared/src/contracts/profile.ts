export interface LearningProfileDto {
  goalText: string;
  currentLevelText: string;
  weeklyTimeMinutes: number;
  userDeclaredWeakPoints: string[];
  derivedWeakPoints: string[];
  recentTopics: string[];
  preferredResponseStyle: string | null;
  progressNotes: string | null;
}

export interface GetLearningProfileResponse {
  profile: LearningProfileDto | null;
}

export interface PatchLearningProfileRequest {
  goalText: string;
  currentLevelText: string;
  weeklyTimeMinutes: number;
  userDeclaredWeakPoints: string[];
}

export interface PatchLearningProfileResponse {
  profile: LearningProfileDto;
}

