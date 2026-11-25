-- Danh sách MSSV của lớp (tải lên từ file CSV)
CREATE TABLE IF NOT EXISTS "class_roster_entries" (
  "class_id" TEXT NOT NULL,
  "student_code" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "class_roster_entries_pkey" PRIMARY KEY ("class_id", "student_code")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_roster_entries_class_id_fkey'
  ) THEN
    ALTER TABLE "class_roster_entries"
      ADD CONSTRAINT "class_roster_entries_class_id_fkey"
      FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;