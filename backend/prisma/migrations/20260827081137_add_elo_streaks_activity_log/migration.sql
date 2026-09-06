-- AlterTable
ALTER TABLE "users" ADD COLUMN     "current_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "elo_rating" INTEGER NOT NULL DEFAULT 1200,
ADD COLUMN     "highest_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_active_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activity_date" DATE NOT NULL,
    "submission_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_activity_logs_user_id_activity_date_key" ON "user_activity_logs"("user_id", "activity_date");

-- AddForeignKey
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
