/**
 * Temporary compatibility shim.
 *
 * The planner-first contracts now live under ./legacy/.
 * Keep this file during migration so existing imports do not break
 * before phase 1.3 rewires index exports.
 */
export * from "./legacy/actions";
