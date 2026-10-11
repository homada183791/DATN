-- Add instructor grading fields to submissions.
ALTER TABLE "submissions"
    ADD COLUMN "instructor_score" DOUBLE PRECISION,
    ADD COLUMN "instructor_feedback" TEXT,
    ADD COLUMN "graded_by" TEXT,
    ADD COLUMN "graded_at" TIMESTAMP(3);
