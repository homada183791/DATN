-- Đồng bộ database với schema.prisma: các cột/giá trị dưới đây đã có trong schema
-- nhưng chưa có migration tương ứng (gây lỗi P2022 "column ... does not exist").
-- Dùng IF NOT EXISTS để chạy an toàn kể cả khi DB đã được thêm tay / db push trước đó.

-- AlterEnum
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'NODE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'submission_graded';

-- AlterTable
ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "allowed_languages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "language_version" TEXT;

-- AlterTable
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;
