-- Idempotent migration: discount coupon support
-- Apply with: npx prisma db execute --file discount-coupon.sql --schema prisma/schema.prisma

-- 1. Add DiscountKind enum
DO $$ BEGIN
  CREATE TYPE "DiscountKind" AS ENUM ('PERCENT', 'FIXED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Coupon: make days nullable (existing rows keep their value), add discount fields
ALTER TABLE "Coupon" ALTER COLUMN "days" DROP NOT NULL;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "discountType"  "DiscountKind";
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "discountValue" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "minOrderPaise" INTEGER;

-- 3. Payment: track which discount coupon was applied and how much was deducted
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "couponCode"    TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountPaise" INTEGER;
