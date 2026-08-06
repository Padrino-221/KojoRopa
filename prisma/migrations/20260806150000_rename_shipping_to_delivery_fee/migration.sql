-- Rename the "shipping" column on Order to "deliveryFee" (terminology change).
-- RENAME COLUMN is metadata-only in Postgres: existing order data is preserved.
ALTER TABLE "Order" RENAME COLUMN "shipping" TO "deliveryFee";
