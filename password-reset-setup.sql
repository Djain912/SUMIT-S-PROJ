-- Password reset tokens. Apply once to Neon (matches the manual-SQL workflow
-- used by trial-setup.sql / invoice-billing.sql). Stores only a hash of the
-- token; the raw token lives only in the emailed link.

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash"  TEXT NOT NULL UNIQUE,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"    ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
