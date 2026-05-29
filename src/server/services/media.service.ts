import { prisma } from '@/lib/db/prisma';

type CreateMediaInput = {
  url: string;
  publicId: string;
  kind: 'IMAGE' | 'PDF';
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  uploadedById?: string;
};

export async function createMediaAsset(input: CreateMediaInput) {
  return prisma.mediaAsset.create({
    data: {
      url: input.url,
      publicId: input.publicId,
      kind: input.kind,
      mimeType: input.mimeType,
      originalName: input.originalName,
      sizeBytes: input.sizeBytes,
      uploadedById: input.uploadedById,
    },
  });
}
