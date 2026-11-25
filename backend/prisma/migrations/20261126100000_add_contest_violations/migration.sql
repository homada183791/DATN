-- CreateTable
CREATE TABLE "contest_violations" (
    "id" TEXT NOT NULL,
    "contest_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "problem_id" TEXT,
    "warnings_after" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contest_violations_contest_id_created_at_idx" ON "contest_violations"("contest_id", "created_at");

-- AddForeignKey
ALTER TABLE "contest_violations" ADD CONSTRAINT "contest_violations_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_violations" ADD CONSTRAINT "contest_violations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
