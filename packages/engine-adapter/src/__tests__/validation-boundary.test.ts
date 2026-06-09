import { describe, it, expect } from "vitest";
import { PROTOCOL_VERSION } from "@civ-clone/protocol-state";
import {
  ValidationBoundary,
  BOUNDARY_ERROR_CODES,
} from "../validation-boundary.js";

const boundary = new ValidationBoundary();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validCmd = {
  protocolVersion: PROTOCOL_VERSION,
  commandId: "00000000-0000-0000-0000-000000000001",
  matchId: "match:abc",
  actorPlayerId: "player:1",
  clientSeq: 1,
  tier: "player",
  actionType: "ChooseResearch",
  valueStableId: "tech:bronze-working",
  sentAt: 1000000,
};

const validTurnEndReq = {
  protocolVersion: PROTOCOL_VERSION,
  matchId: "match:abc",
  actorPlayerId: "player:1",
  commandId: "00000000-0000-0000-0000-000000000002",
  clientSeq: 2,
  sentAt: 1000001,
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

const validDelta = {
  protocolVersion: PROTOCOL_VERSION,
  matchId: "match:abc",
  baseVersion: 1,
  targetVersion: 2,
  patches: [{ op: "set", path: "entities.units.unit:1.health", value: 80 }],
};

const validResult = { commandId: "cmd-1", status: "accepted", serverSeq: 1 };
const validTurnResult = { commandId: "cmd-2", status: "accepted" };

// ---------------------------------------------------------------------------
// validateInboundMessage
// ---------------------------------------------------------------------------

describe("ValidationBoundary — validateInboundMessage", () => {
  it("accepts a valid action message", () => {
    expect(boundary.validateInboundMessage({ type: "action", payload: validCmd }).ok).toBe(true);
  });

  it("accepts a valid turnEnd message", () => {
    expect(boundary.validateInboundMessage({ type: "turnEnd", payload: validTurnEndReq }).ok).toBe(true);
  });

  it("accepts a valid requestSnapshot message", () => {
    expect(
      boundary.validateInboundMessage({ type: "requestSnapshot", matchId: "match:abc", actorPlayerId: "player:1" }).ok
    ).toBe(true);
  });

  it("rejects unknown message type with SCHEMA_INVALID", () => {
    const r = boundary.validateInboundMessage({ type: "hack", payload: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errorCode).toBe(BOUNDARY_ERROR_CODES.SCHEMA_INVALID);
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it("rejects malformed action payload", () => {
    expect(boundary.validateInboundMessage({ type: "action", payload: { commandId: "" } }).ok).toBe(false);
  });

  it("rejects null", () => {
    expect(boundary.validateInboundMessage(null).ok).toBe(false);
  });

  it("rejects primitive string", () => {
    expect(boundary.validateInboundMessage("bad").ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateActionCommand
// ---------------------------------------------------------------------------

describe("ValidationBoundary — validateActionCommand", () => {
  it("accepts a valid ActionCommand", () => {
    const r = boundary.validateActionCommand(validCmd);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.commandId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("accepts a unit-tier command with tile refs", () => {
    expect(
      boundary.validateActionCommand({
        ...validCmd,
        commandId: "cmd-u",
        tier: "unit",
        actionType: "Move",
        unitStableId: "unit:42:3",
        fromTileId: "3:4",
        toTileId: "3:5",
      }).ok
    ).toBe(true);
  });

  it("rejects empty commandId", () => {
    const r = boundary.validateActionCommand({ ...validCmd, commandId: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe(BOUNDARY_ERROR_CODES.SCHEMA_INVALID);
  });

  it("rejects invalid tier value", () => {
    expect(boundary.validateActionCommand({ ...validCmd, tier: "admin" }).ok).toBe(false);
  });

  it("rejects wrong protocol version", () => {
    expect(boundary.validateActionCommand({ ...validCmd, protocolVersion: "9.9" }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateTurnEndRequest
// ---------------------------------------------------------------------------

describe("ValidationBoundary — validateTurnEndRequest", () => {
  it("accepts a valid TurnEndRequest", () => {
    expect(boundary.validateTurnEndRequest(validTurnEndReq).ok).toBe(true);
  });

  it("rejects missing actorPlayerId", () => {
    const { actorPlayerId: _o, ...rest } = validTurnEndReq;
    expect(boundary.validateTurnEndRequest(rest).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateOutboundMessage
// ---------------------------------------------------------------------------

describe("ValidationBoundary — validateOutboundMessage", () => {
  it("accepts a snapshot message", () => {
    expect(boundary.validateOutboundMessage({ type: "snapshot", payload: validSnap }).ok).toBe(true);
  });

  it("accepts a delta message", () => {
    expect(boundary.validateOutboundMessage({ type: "delta", payload: validDelta }).ok).toBe(true);
  });

  it("accepts an actionResult message", () => {
    expect(boundary.validateOutboundMessage({ type: "actionResult", payload: validResult }).ok).toBe(true);
  });

  it("accepts a turnEndResult message", () => {
    expect(boundary.validateOutboundMessage({ type: "turnEndResult", payload: validTurnResult }).ok).toBe(true);
  });

  it("accepts an actionManifest message", () => {
    const r = boundary.validateOutboundMessage({
      type: "actionManifest",
      payload: {
        entries: [
          {
            tier: "player",
            actionType: "ChooseResearch",
            mandatory: true,
            requiresValueRef: true,
            requiresUnitRef: false,
            requiresFromTileRef: false,
            requiresToTileRef: false,
          },
        ],
      },
    });
    expect(r.ok).toBe(true);
  });

  it("rejects unknown outbound message type", () => {
    const r = boundary.validateOutboundMessage({ type: "unknownType", payload: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe(BOUNDARY_ERROR_CODES.SCHEMA_INVALID);
  });
});

// ---------------------------------------------------------------------------
// validateSnapshot
// ---------------------------------------------------------------------------

describe("ValidationBoundary — validateSnapshot", () => {
  it("accepts a valid SnapshotEnvelope", () => {
    const r = boundary.validateSnapshot(validSnap);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.matchId).toBe("match:abc");
  });

  it("rejects wrong protocol version", () => {
    expect(boundary.validateSnapshot({ ...validSnap, protocolVersion: "9.9" }).ok).toBe(false);
  });

  it("rejects missing checksum", () => {
    const { checksum: _c, ...rest } = validSnap;
    expect(boundary.validateSnapshot(rest).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateDelta
// ---------------------------------------------------------------------------

describe("ValidationBoundary — validateDelta", () => {
  it("accepts a valid DeltaEnvelope", () => {
    expect(boundary.validateDelta(validDelta).ok).toBe(true);
  });

  it("rejects targetVersion of 0 (non-positive)", () => {
    expect(boundary.validateDelta({ ...validDelta, targetVersion: 0 }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateActionResult
// ---------------------------------------------------------------------------

describe("ValidationBoundary — validateActionResult", () => {
  it("accepts an accepted ActionResult", () => {
    expect(boundary.validateActionResult(validResult).ok).toBe(true);
  });

  it("accepts a rejected ActionResult with reasonCode", () => {
    expect(
      boundary.validateActionResult({
        commandId: "cmd-1",
        status: "rejected",
        reasonCode: "ACTION_NOT_FOUND",
        serverSeq: 1,
      }).ok
    ).toBe(true);
  });

  it("rejects invalid status value", () => {
    expect(boundary.validateActionResult({ ...validResult, status: "maybe" }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateTurnEndResult
// ---------------------------------------------------------------------------

describe("ValidationBoundary — validateTurnEndResult", () => {
  it("accepts a valid TurnEndResult", () => {
    expect(boundary.validateTurnEndResult(validTurnResult).ok).toBe(true);
  });

  it("rejects invalid status value", () => {
    expect(boundary.validateTurnEndResult({ commandId: "cmd-1", status: "pending" }).ok).toBe(false);
  });
});

