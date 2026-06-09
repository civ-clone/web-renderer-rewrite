/**
 * WP-009 Validation Boundary — throughput benchmark
 *
 * Measures how many inbound and outbound validations the boundary can perform
 * per second. Run with: pnpm wp009:bench
 *
 * Target action rate in a game is well under 100 commands/second.
 * This bench exercises 10,000 iterations of each path to confirm headroom.
 */

import { PROTOCOL_VERSION } from "@civ-clone/protocol-state";
import { ValidationBoundary } from "../validation-boundary.js";

const boundary = new ValidationBoundary();
const ITERATIONS = 10_000;

const validCmd = {
  protocolVersion: PROTOCOL_VERSION,
  commandId: "00000000-0000-0000-0000-000000000001",
  matchId: "match:abc",
  actorPlayerId: "player:1",
  clientSeq: 1,
  tier: "player",
  actionType: "ChooseResearch",
  valueStableId: "tech:bronze-working",
  sentAt: Date.now(),
};

const validSnap = {
  protocolVersion: PROTOCOL_VERSION,
  matchId: "match:abc",
  stateVersion: 1,
  turn: 1,
  entities: {},
  indexes: {},
  requirementsByPlayer: {},
  checksum: "abc123",
};

function bench(label: string, fn: () => void): void {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fn();
  }
  const elapsed = performance.now() - start;
  const opsPerSec = Math.round((ITERATIONS / elapsed) * 1000);
  console.log(`${label}: ${opsPerSec.toLocaleString()} ops/sec (${ITERATIONS} iterations in ${elapsed.toFixed(1)} ms)`);
}

console.log("WP-009 ValidationBoundary throughput benchmark");
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log("─".repeat(60));

bench("validateActionCommand (valid)", () => {
  boundary.validateActionCommand(validCmd);
});

bench("validateActionCommand (invalid — empty commandId)", () => {
  boundary.validateActionCommand({ ...validCmd, commandId: "" });
});

bench("validateInboundMessage (valid action)", () => {
  boundary.validateInboundMessage({ type: "action", payload: validCmd });
});

bench("validateInboundMessage (invalid type)", () => {
  boundary.validateInboundMessage({ type: "hack", payload: {} });
});

bench("validateSnapshot (valid)", () => {
  boundary.validateSnapshot(validSnap);
});

bench("validateOutboundMessage (valid snapshot)", () => {
  boundary.validateOutboundMessage({ type: "snapshot", payload: validSnap });
});

console.log("─".repeat(60));
console.log("Game target: < 100 commands/sec. All paths should exceed 1,000x headroom.");

