-- Idempotent migration: billing details on Payment + Invoice table
-- Apply with: npx prisma db execute --file invoice-billing.sql --schema prisma/schema.prisma

-- 1. Add billing fields to Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billingName"    TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billingPhone"   TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billingEmail"   TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billingCity"    TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billingState"   TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billingPincode" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billingGst"     TEXT;

-- 2. Invoice table
CREATE TABLE IF NOT EXISTS "Invoice" (
  "id"        TEXT         NOT NULL,
  "number"    TEXT         NOT NULL,
  "paymentId" TEXT         NOT NULL,
  "emailSent" BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "Invoice_number_key"    UNIQUE ("number"),
  CONSTRAINT "Invoice_paymentId_key" UNIQUE ("paymentId"),
  CONSTRAINT "Invoice_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Sequence for invoice numbers (safe to run repeatedly)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
