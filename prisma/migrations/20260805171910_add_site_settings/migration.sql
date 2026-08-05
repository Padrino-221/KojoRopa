/*
  Warnings:

  - You are about to drop the column `token` on the `Order` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Order_token_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "token";

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);
