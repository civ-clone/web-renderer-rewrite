import {
  SnapshotExporter,
  ActionCommandHandler,
  DefaultUnitsMigrationAdapter,
} from "../index.js";

function makePlayer() {
  return {
    id: () => "Player-1",
    getStableId: () => "player:1",
    actions: () => [] as never[],
  };
}

function makeUnit(player: ReturnType<typeof makePlayer>) {
  const tile = { x: () => 3, y: () => 4 };
  class Move {}
  const action = Object.assign(Object.create(Move.prototype), {
    unit: () => ({ id: () => "Unit-1", getStableId: () => "unit:42:3" }),
    from: () => tile,
    to: () => ({ x: () => 3, y: () => 5 }),
  });

  return {
    id: () => "Unit-1",
    getStableId: () => "unit:42:3",
    player: () => player,
    tile: () => tile,
    actions: () => [] as never[],
    actionsForNeighbours: () => ({ east: [action] }),
  };
}

const player = makePlayer();
const unit = makeUnit(player);
const unitsAdapter = new DefaultUnitsMigrationAdapter();

const snapshot = new SnapshotExporter().buildSnapshot({
  matchId: "match:wp011-demo",
  stateVersion: 1,
  turn: 1,
  getPlayers: () => [player],
  getUnits: () => [unit],
  getCities: () => [],
  cutover: { units: "migrated" },
  unitsAdapter,
});

console.log("WP-011 migration cutover demo");
console.log("unit entity record:", snapshot.entities["units"]["unit:42:3"]);

const handler = new ActionCommandHandler();
const result = handler.onActionCommand(
  {
    protocolVersion: "1.0",
    commandId: "cmd-1",
    matchId: "match:wp011-demo",
    actorPlayerId: "player:1",
    clientSeq: 1,
    tier: "unit",
    actionType: "Move",
    unitStableId: "unit:42:3",
    fromTileId: "3:4",
    toTileId: "3:5",
    sentAt: Date.now(),
  },
  {
    matchId: "match:wp011-demo",
    cutover: { units: "migrated" },
    unitsAdapter,
    getPlayerActions: () => [],
    getUnitActions: () => [unit.actionsForNeighbours().east[0] as never],
    executePlayerAction: () => undefined,
    executeUnitAction: () => undefined,
  }
);

console.log("command status:", result.status);


