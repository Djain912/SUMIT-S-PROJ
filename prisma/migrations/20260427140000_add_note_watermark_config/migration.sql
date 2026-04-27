-- Add optional watermark settings for notes to discourage unauthorized redistribution.
ALTER TABLE "Note"
ADD COLUMN "watermarkConfig" JSONB;
