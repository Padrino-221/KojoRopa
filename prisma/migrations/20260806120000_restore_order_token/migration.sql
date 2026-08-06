-- Restore the Order.token column (nullable, with unique index).
-- It existed in the schema but was dropped from the migration history by
-- 20260805171910_add_site_settings, leaving the database out of sync with
-- the Prisma client generated from schema.prisma.
-- AlterTable
ALTER TABLE "Order" ADD COLUMN "token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_token_key" ON "Order"("token");
