-- Môn học của lớp (bắt buộc khi tạo mới ở tầng ứng dụng; NULL cho lớp cũ)
ALTER TABLE "classes"
  ADD COLUMN IF NOT EXISTS "subject" TEXT;