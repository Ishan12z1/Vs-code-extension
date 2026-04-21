import type { MarketplaceSearchResult } from "@control-agent/contracts";
import type { SqliteDatabase } from "../db/sqlite";

/**
 * Repository for marketplace cache entries.
 *
 * Current phase note:
 * - cache key generation is left to the caller for now
 * - this keeps the repository focused on persistence only
 */
export class MarketplaceCacheRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  /**
   * Insert or update one marketplace cache entry.
   */
  public put(
    cacheKey: string,
    queryText: string,
    payload: MarketplaceSearchResult,
    expiresAt?: string
  ): void {
    this.db
      .prepare(
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
        `
      )
      .run(
        cacheKey,
        queryText,
        JSON.stringify(payload),
        payload.fetchedAt,
        expiresAt ?? null
      );
  }

  /**
   * Return one marketplace cache payload by cache key.
   */
  public get(cacheKey: string): MarketplaceSearchResult | null {
    const row = this.db
      .prepare(
        `
          SELECT payload_json
          FROM marketplace_cache
          WHERE cache_key = ?
          LIMIT 1
        `
      )
      .get(cacheKey) as { payload_json: string } | undefined;

    if (!row) {
      return null;
    }

    return JSON.parse(row.payload_json) as MarketplaceSearchResult;
  }
}
