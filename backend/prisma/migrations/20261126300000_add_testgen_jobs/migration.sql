-- CreateTable
CREATE TABLE "testgen_jobs" (
    "id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "reference_language" TEXT NOT NULL,
    "reference_code" TEXT NOT NULL,
    "generators" JSONB,
    "candidates" JSONB,
    "summary" JSONB,
    "applied_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testgen_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testgen_jobs_problem_id_created_at_idx" ON "testgen_jobs"("problem_id", "created_at");

-- AddForeignKey
ALTER TABLE "testgen_jobs" ADD CONSTRAINT "testgen_jobs_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
