import { describe, expect, it } from "vitest";
import { DefaultUnitsMigrationAdapter } from "../units-migration-adapter.js";

function tile(x: number, y: number) {
  return { x: () => x, y: () => y };
}

function makeUnit() {
  const player = { id: () => "Player-1", getStableId: () => "player:1" };
  const unit = {
    id: () => "Unit-1",
    getStableId: () => "unit:42:3",
    player: () => player,
    tile: () => tile(3, 4),
    actions: () => [] as never[],
    actionsForNeighbours: () => ({} as Record<string, never[]>),
  };
  return unit;
}

function makeAction(name: string, from: [number, number], to: [number, number]) {
  const ActionClass = { [name]: class {} }[name];
  const unit = makeUnit();
  return Object.assign(Object.create(ActionClass.prototype), {
    unit: () => unit,
    from: () => tile(from[0], from[1]),
    to: () => tile(to[0], to[1]),
  });
}

describe("DefaultUnitsMigrationAdapter", () => {
  it("serializes unit record with stable references", () => {
    const adapter = new DefaultUnitsMigrationAdapter();
    const record = adapter.toUnitRecord(makeUnit());

    expect(record).toEqual({
      unitId: "Unit-1",
      unitStableId: "unit:42:3",
      playerId: "player:1",
      tileId: "3:4",
    });
  });

  it("resolves unit actions in deterministic order", () => {
    const adapter = new DefaultUnitsMigrationAdapter();
    const command = {
      protocolVersion: "1.0",
      commandId: "cmd-1",
      matchId: "m",
      actorPlayerId: "player:1",
      clientSeq: 1,
      tier: "unit",
      actionType: "Move",
      sentAt: 1,
    } as const;

    const actions = [
      makeAction("Fortify", [3, 4], [3, 4]),
      makeAction("Move", [3, 4], [3, 5]),
      makeAction("Move", [3, 4], [2, 4]),
    ];

    const resolved = adapter.resolveUnitActions(command as never, actions as never[]);

    expect(resolved.map((action) => action.constructor.name)).toEqual([
      "Fortify",
      "Move",
      "Move",
    ]);
  });
});

