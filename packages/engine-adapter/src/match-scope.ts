/**
 * WP-012: Match scope coordinator
 *
 * Ties RegistryContainer async context to a complete match lifecycle:
 * - Binds registries into async scope for the duration of a match run.
 * - Provides match-scoped accessor helpers for command handling and snapshot export.
 * - Calls resetAllResettable() on match end to clear per-match state.
 */

import {
  RegistryContainer,
  requireRegistryContainer,
  withRegistryContainer,
} from "./registry-container.js";

export interface MatchScopeOptions {
  matchId: string;
  /**
   * Named registries to make available in the match async scope.
   * Registries with a `reset()` method will be auto-reset on match end.
   */
  registries?: Record<string, unknown>;
  /**
   * If true, resetAllResettable() is called on the container when the match fn resolves.
   * Defaults to true.
   */
  resetOnEnd?: boolean;
}

export interface MatchScopeHandle {
  /** Current match container — available during match fn. */
  container: RegistryContainer;
  /** The match ID this scope was created for. */
  matchId: string;
}

/**
 * Run a match-scoped async function with a bound RegistryContainer.
 *
 * Any code within `fn` can call `requireRegistryContainer()` to read match-local state.
 * After `fn` resolves (or rejects), resettable registries are flushed if resetOnEnd = true.
 *
 * Usage with ActionCommandHandler and SnapshotExporter:
 *   const result = await withMatchScope({ matchId, registries: { units, cities } }, async () => {
 *     // SnapshotExporter, ActionCommandHandler, etc. can read requireRegistryContainer()
 *     return handler.onActionCommand(command, context);
 *   });
 */
export async function withMatchScope<T>(
  options: MatchScopeOptions,
  fn: (handle: MatchScopeHandle) => T | Promise<T>
): Promise<T> {
  const { matchId, registries = {}, resetOnEnd = true } = options;
  const container = new RegistryContainer({ matchId, ...registries });
  const handle: MatchScopeHandle = { container, matchId };

  const result = await withRegistryContainer(container, () => fn(handle));

  if (resetOnEnd) {
    container.resetAllResettable();
  }

  return result;
}

/**
 * Read the active match ID from the container in the current async scope.
 * Throws if no scope is active.
 */
export function requireMatchId(): string {
  return requireRegistryContainer().require<string>("matchId");
}

/**
 * Read an optional match ID from the container if a scope is active.
 */
export function getMatchId(): string | undefined {
  try {
    return requireMatchId();
  } catch {
    return undefined;
  }
}

