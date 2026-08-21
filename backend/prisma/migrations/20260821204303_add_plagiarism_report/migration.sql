-- AlterTable
ALTER TABLE "contests" ADD COLUMN     "is_plagiarism_checked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "plagiarism_reports" (
    "id" TEXT NOT NULL,
    "contest_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "submission_1_id" TEXT NOT NULL,
    "submission_2_id" TEXT NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plagiarism_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "plagiarism_reports" ADD CONSTRAINT "plagiarism_reports_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plagiarism_reports" ADD CONSTRAINT "plagiarism_reports_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plagiarism_reports" ADD CONSTRAINT "plagiarism_reports_submission_1_id_fkey" FOREIGN KEY ("submission_1_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plagiarism_reports" ADD CONSTRAINT "plagiarism_reports_submission_2_id_fkey" FOREIGN KEY ("submission_2_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
