import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePhase2Schema20260415010100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL,
        "display_name" varchar(80) NULL,
        "onboarding_completed" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "CHK_users_email_not_blank" CHECK (char_length(btrim("email")) > 0),
        CONSTRAINT "CHK_users_email_lowercase" CHECK ("email" = lower("email"))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "email_verification_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL,
        "purpose" text NOT NULL DEFAULT 'login',
        "code_hash" char(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz NULL,
        "attempt_count" smallint NOT NULL DEFAULT 0,
        "last_sent_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_verification_codes_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_email_verification_codes_email_not_blank" CHECK (char_length(btrim("email")) > 0),
        CONSTRAINT "CHK_email_verification_codes_email_lowercase" CHECK ("email" = lower("email")),
        CONSTRAINT "CHK_email_verification_codes_purpose" CHECK ("purpose" IN ('login')),
        CONSTRAINT "CHK_email_verification_codes_attempt_count_non_negative" CHECK ("attempt_count" >= 0),
        CONSTRAINT "CHK_email_verification_codes_consumed_after_created" CHECK (
          "consumed_at" IS NULL OR "consumed_at" >= "created_at"
        ),
        CONSTRAINT "CHK_email_verification_codes_expires_after_created" CHECK (
          "expires_at" >= "created_at"
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "session_token_hash" char(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "last_used_at" timestamptz NOT NULL DEFAULT now(),
        "ip_address" inet NULL,
        "user_agent" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_sessions_session_token_hash" UNIQUE ("session_token_hash"),
        CONSTRAINT "FK_auth_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_auth_sessions_expires_at_after_created_at" CHECK ("expires_at" >= "created_at")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "learning_profiles" (
        "user_id" uuid NOT NULL,
        "goal_text" text NOT NULL,
        "current_level_text" text NOT NULL,
        "weekly_time_minutes" integer NOT NULL,
        "user_declared_weak_points" text[] NOT NULL DEFAULT '{}',
        "derived_weak_points" text[] NOT NULL DEFAULT '{}',
        "recent_topics" text[] NOT NULL DEFAULT '{}',
        "preferred_response_style" text NULL,
        "progress_notes" text NULL,
        "last_profile_refresh_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_learning_profiles_user_id" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_learning_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_learning_profiles_goal_text_not_blank" CHECK (char_length(btrim("goal_text")) > 0),
        CONSTRAINT "CHK_learning_profiles_current_level_text_not_blank" CHECK (char_length(btrim("current_level_text")) > 0),
        CONSTRAINT "CHK_learning_profiles_weekly_time_minutes_positive" CHECK ("weekly_time_minutes" > 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" text NOT NULL DEFAULT '新对话',
        "title_generated" boolean NOT NULL DEFAULT false,
        "summary" text NULL,
        "message_count" integer NOT NULL DEFAULT 0,
        "last_message_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_conversations_title_not_blank" CHECK (char_length(btrim("title")) > 0),
        CONSTRAINT "CHK_conversations_message_count_non_negative" CHECK ("message_count" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL,
        "seq_no" integer NOT NULL,
        "role" text NOT NULL,
        "status" text NOT NULL,
        "content_text" text NOT NULL,
        "input_tokens" integer NULL,
        "output_tokens" integer NULL,
        "latency_ms" integer NULL,
        "error_code" varchar(64) NULL,
        "error_message" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation_id" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_messages_conversation_id_seq_no" UNIQUE ("conversation_id", "seq_no"),
        CONSTRAINT "CHK_messages_seq_no_positive" CHECK ("seq_no" > 0),
        CONSTRAINT "CHK_messages_role" CHECK ("role" IN ('user', 'assistant')),
        CONSTRAINT "CHK_messages_status" CHECK ("status" IN ('completed', 'failed')),
        CONSTRAINT "CHK_messages_input_tokens_non_negative" CHECK ("input_tokens" IS NULL OR "input_tokens" >= 0),
        CONSTRAINT "CHK_messages_output_tokens_non_negative" CHECK ("output_tokens" IS NULL OR "output_tokens" >= 0),
        CONSTRAINT "CHK_messages_latency_ms_non_negative" CHECK ("latency_ms" IS NULL OR "latency_ms" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_email_verification_codes_email_purpose_created_at"
      ON "email_verification_codes" ("email", "purpose", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_email_verification_codes_email_purpose_expires_at"
      ON "email_verification_codes" ("email", "purpose", "expires_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_auth_sessions_user_id_expires_at"
      ON "auth_sessions" ("user_id", "expires_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_conversations_user_id_last_message_at"
      ON "conversations" ("user_id", "last_message_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_conversations_user_id_created_at"
      ON "conversations" ("user_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_messages_conversation_id_created_at"
      ON "messages" ("conversation_id", "created_at" ASC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_messages_conversation_id_created_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_conversations_user_id_created_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_conversations_user_id_last_message_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_auth_sessions_user_id_expires_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_email_verification_codes_email_purpose_expires_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_email_verification_codes_email_purpose_created_at"');
    await queryRunner.query('DROP TABLE IF EXISTS "messages"');
    await queryRunner.query('DROP TABLE IF EXISTS "conversations"');
    await queryRunner.query('DROP TABLE IF EXISTS "learning_profiles"');
    await queryRunner.query('DROP TABLE IF EXISTS "auth_sessions"');
    await queryRunner.query('DROP TABLE IF EXISTS "email_verification_codes"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }
}
