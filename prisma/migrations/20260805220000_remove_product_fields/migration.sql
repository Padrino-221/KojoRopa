-- AlterTable
ALTER TABLE "Product" DROP COLUMN "era",
DROP COLUMN "year",
DROP COLUMN "fitNote",
DROP COLUMN "tags",
DROP COLUMN "inventory";

-- DropIndex
DROP INDEX "Product_year_idx";
