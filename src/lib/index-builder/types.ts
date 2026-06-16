// Shared types for the Index Builder feature.

export type WeightingMethod = 'EQUAL' | 'MARKET_CAP';
export type IndexVisibility = 'PRIVATE' | 'PUBLIC';

// A user-saved custom index (mirrors the Prisma `Index` model, serialised).
export interface SavedIndex {
  id: string;
  name: string;
  weightingType: WeightingMethod;
  constituents: string[];
  customWeights: Record<string, number> | null;
  description: string | null;
  visibility: IndexVisibility;
  shareId: string | null;
  createdAt: string;
  updatedAt: string;
}

// A built-in sector/theme index from sectorIndices.json (read-only template).
export interface ReadyMadeIndex {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  constituents: string[];
}

// Payload accepted when creating/updating an index.
export interface IndexInput {
  name: string;
  weightingType: WeightingMethod;
  constituents: string[];
  customWeights?: Record<string, number> | null;
  description?: string | null;
  visibility?: IndexVisibility;
}
