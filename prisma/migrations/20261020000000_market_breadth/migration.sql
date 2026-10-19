-- CreateTable
CREATE TABLE IF NOT EXISTS "StockDaily" (
    "symbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "prevClose" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "StockDaily_pkey" PRIMARY KEY ("symbol","date")
);
CREATE INDEX IF NOT EXISTS "StockDaily_date_idx" ON "StockDaily"("date");

-- CreateTable
CREATE TABLE IF NOT EXISTS "BreadthDaily" (
    "date" TEXT NOT NULL,
    "stocks" INTEGER NOT NULL,
    "advances" INTEGER NOT NULL,
    "declines" INTEGER NOT NULL,
    "unchanged" INTEGER NOT NULL,
    "pctAbove20" DOUBLE PRECISION,
    "pctAbove50" DOUBLE PRECISION,
    "pctAbove200" DOUBLE PRECISION,
    "pctGolden" DOUBLE PRECISION,
    "newHighs" INTEGER,
    "newLows" INTEGER,
    "adLine" DOUBLE PRECISION NOT NULL,
    "ema19" DOUBLE PRECISION NOT NULL,
    "ema39" DOUBLE PRECISION NOT NULL,
    "mcclellan" DOUBLE PRECISION NOT NULL,
    "sectors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BreadthDaily_pkey" PRIMARY KEY ("date")
);
