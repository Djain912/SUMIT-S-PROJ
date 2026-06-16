-- Razorpay payments — run ONCE in the Neon SQL Editor (database: neondb).
-- Safe to re-run: every statement guards against "already exists".

-- 1. Payment status enum
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "level"             "CmtLevel" NOT NULL DEFAULT 'LEVEL_1',
  "amount"            INTEGER NOT NULL,
  "currency"          TEXT NOT NULL DEFAULT 'INR',
  "status"            "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "razorpayOrderId"   TEXT NOT NULL,
  "razorpayPaymentId" TEXT,
  "grantedUntil"      TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "Payment_userId_status_idx" ON "Payment"("userId", "status");
CREATE INDEX IF NOT EXISTS "Payment_razorpayPaymentId_idx" ON "Payment"("razorpayPaymentId");

-- 4. Foreign key to User (guarded so re-running won't error)
DO $$ BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
