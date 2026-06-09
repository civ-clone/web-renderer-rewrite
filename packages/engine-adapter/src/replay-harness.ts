import type {
  ActionCommand,
  ActionResult,
  SnapshotEnvelope,
} from "@civ-clone/protocol-state";
import {
  createObservabilityEvent,
  type ObservabilitySink,
} from "./observability.js";
import {
  ActionCommandHandler,
  type ActionCommandHandlerContext,
} from "./action-command-handler.js";
import { DeltaExporter } from "./delta-exporter.js";

export interface ReplayCommandStreamEntry {
  command: ActionCommand;
  expectedStatus?: ActionResult["status"];
}

export interface ReplayHarnessContext {
  actionHandler: ActionCommandHandler;
  actionContext: ActionCommandHandlerContext;
  exportSnapshot: () => SnapshotEnvelope;
  observability?: ObservabilitySink;
}

export interface ReplayRunOptions {
  expectedFinalChecksum?: string;
  failFast?: boolean;
}

export interface ReplayFailure {
  index: number;
  commandId: string;
  message: string;
}

export interface ReplayRunSummary {
  commandCount: number;
  acceptedCount: number;
  rejectedCount: number;
  deferredCount: number;
  snapshotCount: number;
  deltaCount: number;
  finalChecksum: string;
  expectedFinalChecksum?: string;
  checksumMatched?: boolean;
  failures: ReplayFailure[];
  results: ActionResult[];
}

export class ReplayHarness {
  run(
    stream: ReplayCommandStreamEntry[],
    context: ReplayHarnessContext,
    options: ReplayRunOptions = {}
  ): ReplayRunSummary {
    const failFast = options.failFast !== false;
    const observability =
      context.observability ?? context.actionContext.observability;
    const deltaExporter = new DeltaExporter();
    const failures: ReplayFailure[] = [];
    const results: ActionResult[] = [];

    observability?.record(
      createObservabilityEvent(
        "replay.started",
        {
          commandCount: stream.length,
          failFast,
          expectedFinalChecksum: options.expectedFinalChecksum,
        },
        context.actionContext.matchId
      )
    );

    let previousSnapshot = context.exportSnapshot();
    let snapshotCount = 1;
    let deltaCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let deferredCount = 0;

    for (let index = 0; index < stream.length; index += 1) {
      const entry = stream[index];
      observability?.record(
        createObservabilityEvent(
          "replay.command",
          {
            index,
            commandId: entry.command.commandId,
            actionType: entry.command.actionType,
            tier: entry.command.tier,
          },
          context.actionContext.matchId
        )
      );

      const result = context.actionHandler.onActionCommand(entry.command, {
        ...context.actionContext,
        observability,
      });
      results.push(result);

      if (result.status === "accepted") {
        acceptedCount += 1;
      } else if (result.status === "rejected") {
        rejectedCount += 1;
      } else {
        deferredCount += 1;
      }

      if (entry.expectedStatus && entry.expectedStatus !== result.status) {
        failures.push({
          index,
          commandId: entry.command.commandId,
          message: `Expected status ${entry.expectedStatus} but got ${result.status}`,
        });

        if (failFast) {
          break;
        }
      }

      const nextSnapshot = context.exportSnapshot();
      snapshotCount += 1;
      deltaExporter.buildDelta(previousSnapshot, nextSnapshot, observability);
      deltaCount += 1;
      previousSnapshot = nextSnapshot;
    }

    let checksumMatched: boolean | undefined;
    if (options.expectedFinalChecksum !== undefined) {
      checksumMatched = previousSnapshot.checksum === options.expectedFinalChecksum;
      if (!checksumMatched) {
        failures.push({
          index: stream.length,
          commandId: "<final-checksum>",
          message: `Expected final checksum ${options.expectedFinalChecksum} but got ${previousSnapshot.checksum}`,
        });
      }
    }

    observability?.record(
      createObservabilityEvent(
        "replay.completed",
        {
          commandCount: stream.length,
          acceptedCount,
          rejectedCount,
          deferredCount,
          snapshotCount,
          deltaCount,
          finalChecksum: previousSnapshot.checksum,
          failures: failures.length,
        },
        context.actionContext.matchId
      )
    );

    return {
      commandCount: stream.length,
      acceptedCount,
      rejectedCount,
      deferredCount,
      snapshotCount,
      deltaCount,
      finalChecksum: previousSnapshot.checksum,
      ...(options.expectedFinalChecksum !== undefined && {
        expectedFinalChecksum: options.expectedFinalChecksum,
        checksumMatched,
      }),
      failures,
      results,
    };
  }
}

