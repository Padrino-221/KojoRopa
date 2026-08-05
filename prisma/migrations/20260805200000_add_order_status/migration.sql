-- AlterTable
ALTER TABLE "Order" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");
