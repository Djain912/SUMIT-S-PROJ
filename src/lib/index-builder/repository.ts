import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import type { SavedIndex } from './types';

type IndexRow = {
  id: string; name: string; weightingType: 'EQUAL' | 'MARKET_CAP';
  constituents: Prisma.JsonValue; customWeights: Prisma.JsonValue;
  chartState: Prisma.JsonValue;
  description: string | null; visibility: 'PRIVATE' | 'PUBLIC'; shareId: string | null;
  createdAt: Date; updatedAt: Date;
};

// Serialise a Prisma Index row into the API/client shape.
export function serializeIndex(row: IndexRow): SavedIndex {
  return {
    id: row.id,
    name: row.name,
    weightingType: row.weightingType,
    constituents: Array.isArray(row.constituents) ? (row.constituents as string[]) : [],
    customWeights: (row.customWeights as Record<string, number> | null) ?? null,
    chartState: (row.chartState as Record<string, unknown> | null) ?? null,
    description: row.description,
    visibility: row.visibility,
    shareId: row.shareId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Short, URL-safe, hard-to-guess id for public share links (/indices/<shareId>).
export function generateShareId(): string {
  return crypto.randomBytes(9).toString('base64url'); // 12 chars
}
