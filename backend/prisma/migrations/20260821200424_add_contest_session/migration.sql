-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "score" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "submission_test_results" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "testcase_index" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "execution_time" INTEGER,
    "memory_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_sessions" (
    "id" TEXT NOT NULL,
    "contest_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "cheat_warnings" INTEGER NOT NULL DEFAULT 0,
    "is_disqualified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contest_sessions_contest_id_student_id_key" ON "contest_sessions"("contest_id", "student_id");

-- AddForeignKey
ALTER TABLE "submission_test_results" ADD CONSTRAINT "submission_test_results_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_sessions" ADD CONSTRAINT "contest_sessions_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_sessions" ADD CONSTRAINT "contest_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
