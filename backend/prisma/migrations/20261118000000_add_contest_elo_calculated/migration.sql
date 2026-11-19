ALTER TABLE "contests"
  ADD COLUMN IF NOT EXISTS "is_elo_calculated" BOOLEAN NOT NULL DEFAULT false;

-- Các kỳ thi đã kết thúc trước khi bật tự động cập nhật ELO được coi là đã xử lý,
-- tránh việc hệ thống tự cộng/trừ ELO lần nữa cho các kỳ thi cũ.
UPDATE "contests" SET "is_elo_calculated" = true WHERE "end_time" < NOW();