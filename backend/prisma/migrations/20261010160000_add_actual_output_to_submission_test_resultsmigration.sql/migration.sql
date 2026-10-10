-- The `actual_output` field has existed on the SubmissionTestResult model in
-- schema.prisma for a while, but no migration was ever generated for it, so
-- the column is missing from the real database (causes P2022 ColumnNotFound
-- errors whenever submissions.findOne() selects it).
ALTER TABLE "submission_test_results" ADD COLUMN "actual_output" TEXT;
