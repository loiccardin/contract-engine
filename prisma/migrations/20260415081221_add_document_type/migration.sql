-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "document_type" VARCHAR(20) NOT NULL DEFAULT 'all';

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "document_type" VARCHAR(20) NOT NULL DEFAULT 'promesse';
