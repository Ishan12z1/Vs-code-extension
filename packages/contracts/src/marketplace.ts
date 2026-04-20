import { z } from "zod";

export const MarketplaceQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).default(10),
  includePrerelease: z.boolean().default(false),
});

export type MarketplaceQuery = z.infer<typeof MarketplaceQuerySchema>;

export const MarketplaceExtensionSchema = z.object({
  extensionId: z.string().min(1),
  publisher: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  installs: z.number().int().nonnegative().optional(),
  rating: z.number().min(0).max(5).optional(),
  tags: z.array(z.string()).default([]),
});

export type MarketplaceExtension = z.infer<typeof MarketplaceExtensionSchema>;

export const MarketplaceSearchResultSchema = z.object({
  query: MarketplaceQuerySchema,
  results: z.array(MarketplaceExtensionSchema).default([]),
  fetchedAt: z.string().datetime(),
});

export type MarketplaceSearchResult = z.infer<
  typeof MarketplaceSearchResultSchema
>;
