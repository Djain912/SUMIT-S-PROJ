import { z } from 'zod';

// Validation for index create/update payloads. Keeps the saved data sane and
// bounded (symbols are short tickers; an index is a handful to a few dozen).
const symbol = z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9.&-]+$/);

export const indexInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  weightingType: z.enum(['EQUAL', 'MARKET_CAP']),
  constituents: z.array(symbol).min(1).max(100),
  customWeights: z.record(z.string(), z.number().nonnegative()).nullish(),
  chartState: z.record(z.string(), z.unknown()).nullish(),
  description: z.string().trim().max(300).nullish(),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).optional(),
});

// PATCH allows partial updates of the same fields.
export const indexUpdateSchema = indexInputSchema.partial();

export type IndexInputParsed = z.infer<typeof indexInputSchema>;
