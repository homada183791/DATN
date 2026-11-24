-- MSSV (8 chữ số) duy nhất cho mỗi tài khoản. Cho phép NULL để không ảnh hưởng tài khoản cũ / đăng nhập Google.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "student_code" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_student_code_key" ON "users"("student_code");