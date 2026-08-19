-- Replace the legacy ADMIN role while preserving existing users.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE TEXT
  USING "role"::TEXT;

UPDATE "users"
SET "role" = 'INSTRUCTOR'
WHERE "role" = 'ADMIN';

DROP TYPE "Role";

CREATE TYPE "Role" AS ENUM ('STUDENT', 'INSTRUCTOR');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING "role"::"Role";

ALTER TABLE "users"
  ALTER COLUMN "role" SET DEFAULT 'STUDENT';