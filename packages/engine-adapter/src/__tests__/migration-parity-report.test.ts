import { describe, expect, it } from "vitest";
import { buildMigrationParityReport } from "../migration-parity-report.js";

describe("buildMigrationParityReport", () => {
  it("aggregates migration shadow parity events by subsystem", () => {
    const report = buildMigrationParityReport([
      {
        type: "migration.shadow.units",
        at: 1,
        payload: { parityMatched: true },
      },
      {
        type: "migration.shadow.units",
        at: 2,
        payload: { parityMatched: false, mismatchType: "actions" },
      },
      {
        type: "migration.shadow.cities",
        at: 3,
        payload: { parityMatched: false, mismatchType: "record" },
      },
      {
        type: "snapshot.exported",
        at: 4,
        payload: {},
      },
    ]);

    expect(report.totalEvents).toBe(3);
    expect(report.matched).toBe(1);
    expect(report.mismatched).toBe(2);
    expect(report.bySubsystem.units).toEqual({
      events: 2,
      matched: 1,
      mismatched: 1,
      mismatchTypes: { actions: 1 },
    });
    expect(report.bySubsystem.cities).toEqual({
      events: 1,
      matched: 0,
      mismatched: 1,
      mismatchTypes: { record: 1 },
    });
  });

  it("returns zeroed report when no migration events are present", () => {
    const report = buildMigrationParityReport([
      {
        type: "command.received",
        at: 1,
        payload: { commandId: "cmd-1" },
      },
    ]);

    expect(report).toEqual({
      totalEvents: 0,
      matched: 0,
      mismatched: 0,
      bySubsystem: {},
    });
  });
});

