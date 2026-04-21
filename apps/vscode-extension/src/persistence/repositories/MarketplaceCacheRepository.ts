import type { MarketplaceSearchResult } from "@control-agent/contracts";
import { executeMutation, queryOne, type SqliteDatabase } from "../db/sqlite";

/**
 * Repository for marketplace cache entries.
 */
export class MarketplaceCacheRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  public put(
    cacheKey: string,
    queryText: string,
    payload: MarketplaceSearchResult,
    expiresAt?: string
  ): void {
    executeMutation(
      this.db,
      `
        INSERT INTO marketplace_cache (
          cache_key,
          query_text,
          payload_json,
          fetched_at,
          expires_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
          query_text = excluded.query_text,
          payload_json = excluded.payload_json,
          fetched_at = excluded.fetched_at,
          expires_at = excluded.expires_at
      `,
      [
        cacheKey,
        queryText,
        JSON.stringify(payload),
        payload.fetchedAt,
        expiresAt ?? null,
      ]
    );
  }

  public get(cacheKey: string): MarketplaceSearchResult | null {
    const row = queryOne<{ payload_json: string }>(
      this.db,
      `
        SELECT payload_json
        FROM marketplace_cache
        WHERE cache_key = ?
        LIMIT 1
      `,
      [cacheKey]
    );

    if (!row) {
      return null;
    }

    return JSON.parse(row.payload_json) as MarketplaceSearchResult;
  }
}
