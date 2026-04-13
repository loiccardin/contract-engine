-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "content_courte" TEXT,
ADD COLUMN     "content_standard" TEXT;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "duree_type" VARCHAR(20) NOT NULL DEFAULT 'standard';
