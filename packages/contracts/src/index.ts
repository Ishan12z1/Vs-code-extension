/**
 * Primary runtime-first contracts.
 *
 * These are the default shared contracts for the local-first V1 architecture.
 */
export * from "./runtime";
export * from "./tools";
export * from "./surfaces";
export * from "./policy";
export * from "./history";
export * from "./rollback";
export * from "./marketplace";

/**
 * Transitional planner/backend-adjacent exports.
 *
 * Keep these exported for now so the existing extension/backend code
 * continues to compile during migration.
 */
export * from "./requests";
export * from "./api";

/**
 * Explicit legacy planner-first contracts.
 *
 * Use:
 *   import { legacy } from "@control-agent/contracts";
 */
export * as legacy from "./legacy";
