import type { ObservabilityEvent } from "./observability.js";

export interface SubsystemParitySummary {
  events: number;
  matched: number;
  mismatched: number;
  mismatchTypes: Record<string, number>;
}

export interface MigrationParityReport {
  totalEvents: number;
  matched: number;
  mismatched: number;
  bySubsystem: Record<string, SubsystemParitySummary>;
}

function ensureSubsystem(
  bySubsystem: Record<string, SubsystemParitySummary>,
  subsystem: string
): SubsystemParitySummary {
  if (!bySubsystem[subsystem]) {
    bySubsystem[subsystem] = {
      events: 0,
      matched: 0,
      mismatched: 0,
      mismatchTypes: {},
    };
  }
  return bySubsystem[subsystem];
}

/**
 * Build a compact migration parity report from observability events.
 */
export function buildMigrationParityReport(
  events: ObservabilityEvent[]
): MigrationParityReport {
  const bySubsystem: Record<string, SubsystemParitySummary> = {};
  let totalEvents = 0;
  let matched = 0;
  let mismatched = 0;

  for (const event of events) {
    if (!event.type.startsWith("migration.shadow.")) {
      continue;
    }

    const subsystem = event.type.replace("migration.shadow.", "");
    const summary = ensureSubsystem(bySubsystem, subsystem);
    const parityMatched = event.payload["parityMatched"] === true;
    const mismatchType =
      typeof event.payload["mismatchType"] === "string"
        ? (event.payload["mismatchType"] as string)
        : "unknown";

    summary.events += 1;
    totalEvents += 1;

    if (parityMatched) {
      summary.matched += 1;
      matched += 1;
      continue;
    }

    summary.mismatched += 1;
    summary.mismatchTypes[mismatchType] =
      (summary.mismatchTypes[mismatchType] ?? 0) + 1;
    mismatched += 1;
  }

  return {
    totalEvents,
    matched,
    mismatched,
    bySubsystem,
  };
}

