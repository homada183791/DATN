-- Sinh test ngay trong form tạo đề, không cần lời giải mẫu
ALTER TABLE "testgen_jobs" ALTER COLUMN "problem_id" DROP NOT NULL;
ALTER TABLE "testgen_jobs" ALTER COLUMN "reference_language" DROP NOT NULL;
ALTER TABLE "testgen_jobs" ALTER COLUMN "reference_code" DROP NOT NULL;
ALTER TABLE "testgen_jobs" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'REFERENCE';
ALTER TABLE "testgen_jobs" ADD COLUMN "spec" JSONB;
ALTER TABLE "testgen_jobs" ADD COLUMN "solutions" JSONB;

-- CreateIndex
CREATE INDEX "testgen_jobs_created_by_created_at_idx" ON "testgen_jobs"("created_by", "created_at");
