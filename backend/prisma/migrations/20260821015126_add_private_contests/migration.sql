-- AlterTable
ALTER TABLE "contests" ADD COLUMN     "class_id" TEXT,
ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "contests" ADD CONSTRAINT "contests_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
