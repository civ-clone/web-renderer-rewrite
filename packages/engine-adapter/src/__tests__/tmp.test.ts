/**
 * WP-003 unit-tier smoke test.
 *
 * Covers the full unit Move resolution path: commandId, tile matching, unit ID,
 * stable-ID preference, and verify executeUnitAction is called exactly once.
 */

import { describe, it, expect } from "vitest";
import { PROTOCOL_VERSION, type ActionCommand } from "@civ-clone/protocol-state";
import {
  ActionCommandHandler,
  type ActionCommandHandlerContext,
} from "../action-command-handler.js";

function makeUnitMoveCommand(overrides: Partial<ActionCommand> = {}): ActionCommand {
  return {
    protocolVersion: PROTOCOL_VERSION,
    commandId: "unit-move-1",
    matchId: "match-1",
    actorPlayerId: "player:1",
    clientSeq: 1,
    tier: "unit",
    actionType: "Move",
    unitId: "Unit-1",
    unitStableId: "unit:42:3",
    fromTileId: "3:4",
    toTileId: "3:5",
    sentAt: Date.now(),
    ...overrides,
  };
}

function makeTile(x: number, y: number) {
  return { x: () => x, y: () => y };
}

function makeUnitAction(params: {
  actionType: string;
  unitId: string;
  unitStableId?: string;
  from: [number, number];
  to: [number, number];
}) {
  const ActionClass = { [params.actionType]: class {} }[params.actionType];

  return Object.assign(Object.create(ActionClass.prototype), {
    unit: () => ({
      id: () => params.unitId,
      getStableId: params.unitStableId ? () => params.unitStableId : undefined,
    }),
    from: () => makeTile(...params.from),
    to: () => makeTile(...params.to),
  });
}

function makeContext(
  overrides: Partial<ActionCommandHandlerContext> = {}
): { context: ActionCommandHandlerContext; calls: { player: number; unit: number } } {
  const calls = { player: 0, unit: 0 };

  return {
    calls,
    context: {
      matchId: "match-1",
      getPlayerActions: () => [],
      getUnitActions: () => [],
      executePlayerAction: () => { calls.player += 1; },
      executeUnitAction: () => { calls.unit += 1; },
      ...overrides,
    },
  };
}

describe("WP-003 unit-tier resolution smoke test", () => {
  it("resolves a Move command to the matching unit action by stable unit ID and tile coords", () => {
    const handler = new ActionCommandHandler();
    const unitAction = makeUnitAction({
      actionType: "Move",
      unitId: "Unit-1",
      unitStableId: "unit:42:3",
      from: [3, 4],
      to: [3, 5],
    });
    const { context, calls } = makeContext({
      getUnitActions: () => [unitAction],
    });

    const result = handler.onActionCommand(makeUnitMoveCommand(), context);

    expect(result.status).toBe("accepted");
    expect(result.serverSeq).toBe(1);
    expect(calls.unit).toBe(1);
    expect(calls.player).toBe(0);
  });

  it("rejects a Move command when the unit stable ID does not match", () => {
    const handler = new ActionCommandHandler();
    const unitAction = makeUnitAction({
      actionType: "Move",
      unitId: "Unit-99",
      unitStableId: "unit:99:0",
      from: [3, 4],
      to: [3, 5],
    });
    const { context, calls } = makeContext({
      getUnitActions: () => [unitAction],
    });

    const result = handler.onActionCommand(makeUnitMoveCommand(), context);

    expect(result.status).toBe("rejected");
    expect(result.reasonCode).toBe("ACTION_NOT_FOUND");
    expect(calls.unit).toBe(0);
  });

  it("rejects when the from/to tile does not match", () => {
    const handler = new ActionCommandHandler();
    const unitAction = makeUnitAction({
      actionType: "Move",
      unitId: "Unit-1",
      unitStableId: "unit:42:3",
      from: [7, 7],
      to: [7, 8],
    });
    const { context, calls } = makeContext({
      getUnitActions: () => [unitAction],
    });

    const result = handler.onActionCommand(makeUnitMoveCommand(), context);

    expect(result.status).toBe("rejected");
    expect(result.reasonCode).toBe("ACTION_NOT_FOUND");
    expect(calls.unit).toBe(0);
  });

  it("executes unit action only once for duplicate commandId", () => {
    const handler = new ActionCommandHandler();
    const unitAction = makeUnitAction({
      actionType: "Move",
      unitId: "Unit-1",
      unitStableId: "unit:42:3",
      from: [3, 4],
      to: [3, 5],
    });
    const { context, calls } = makeContext({
      getUnitActions: () => [unitAction],
    });

    const cmd = makeUnitMoveCommand();
    handler.onActionCommand(cmd, context);
    handler.onActionCommand(cmd, context);

    expect(calls.unit).toBe(1);
  });
});
