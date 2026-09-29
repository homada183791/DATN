-- AlterTable
ALTER TABLE "users"
    ADD COLUMN "full_name" TEXT,
    ADD COLUMN "bio" TEXT,
    ADD COLUMN "institution" TEXT,
    ADD COLUMN "avatar_url" TEXT,
    ADD COLUMN "notification_settings" JSONB,
    ADD COLUMN "preferences" JSONB;