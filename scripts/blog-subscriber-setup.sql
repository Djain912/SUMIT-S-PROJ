CREATE TABLE IF NOT EXISTS "BlogSubscriber" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email"            TEXT NOT NULL,
  "unsubscribeToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "subscribedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlogSubscriber_email_key" ON "BlogSubscriber"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "BlogSubscriber_unsubscribeToken_key" ON "BlogSubscriber"("unsubscribeToken");
CREATE INDEX IF NOT EXISTS "BlogSubscriber_email_idx" ON "BlogSubscriber"("email");
