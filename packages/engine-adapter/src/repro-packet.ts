import type { ActionCommand } from "@civ-clone/protocol-state";
import type { ObservabilityEvent } from "./observability.js";
import type {
  ReplayCommandStreamEntry,
  ReplayRunSummary,
} from "./replay-harness.js";

export interface ReplayFailurePacket {
  createdAt: number;
  reason: string;
  expectedFinalChecksum?: string;
  actualFinalChecksum: string;
  summary: ReplayRunSummary;
  commandStream: ActionCommand[];
  recentEvents: ObservabilityEvent[];
}

export function buildReproPacket(params: {
  reason: string;
  summary: ReplayRunSummary;
  stream: ReplayCommandStreamEntry[];
  events?: ObservabilityEvent[];
  maxRecentEvents?: number;
}): ReplayFailurePacket {
  const maxRecentEvents = params.maxRecentEvents ?? 100;

  return {
    createdAt: Date.now(),
    reason: params.reason,
    expectedFinalChecksum: params.summary.expectedFinalChecksum,
    actualFinalChecksum: params.summary.finalChecksum,
    summary: params.summary,
    commandStream: params.stream.map((entry) => entry.command),
    recentEvents: (params.events ?? []).slice(-maxRecentEvents),
  };
}

