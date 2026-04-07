-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "order_index" INTEGER NOT NULL,
    "scope" VARCHAR(20) NOT NULL DEFAULT 'common',
    "content_common" TEXT,
    "content_classique" TEXT,
    "content_studio" TEXT,
    "content_20pct" TEXT,
    "content_particulier" TEXT,
    "content_societe" TEXT,
    "content_zones_cj" TEXT,
    "content_zones_r" TEXT,
    "content_sans_menage" TEXT,
    "is_page_break_before" BOOLEAN NOT NULL DEFAULT false,
    "keep_together" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "commission_type" VARCHAR(20) NOT NULL,
    "statut_type" VARCHAR(20) NOT NULL,
    "menage_type" VARCHAR(20) NOT NULL,
    "google_doc_id" VARCHAR(100),
    "docusign_template_name" VARCHAR(255),
    "docusign_powerform_id" VARCHAR(100),
    "docusign_template_id" VARCHAR(100),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versions" (
    "id" SERIAL NOT NULL,
    "version_number" INTEGER NOT NULL,
    "description" TEXT,
    "archive_drive_folder_id" VARCHAR(100),
    "pushed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pushed_by" VARCHAR(100),

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_code_key" ON "articles"("code");

-- CreateIndex
CREATE INDEX "idx_articles_order" ON "articles"("order_index");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_code_key" ON "contracts"("code");

-- CreateIndex
CREATE INDEX "idx_versions_number" ON "versions"("version_number" DESC);
