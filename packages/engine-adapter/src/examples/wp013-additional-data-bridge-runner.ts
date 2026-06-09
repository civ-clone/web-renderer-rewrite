import { SnapshotExporter } from "../snapshot-exporter.js";

const player = {
  id: () => "Player-1",
  getStableId: () => "player:1",
  actions: () => [] as never[],
};

const exporter = new SnapshotExporter();

const snapshot = exporter.buildSnapshot({
  matchId: "match:wp013-demo",
  stateVersion: 1,
  turn: 1,
  getPlayers: () => [player],
  getUnits: () => [],
  getCities: () => [],
  getAdditionalEntityTables: () => ({
    worlds: {
      "world:player:1": {
        discoveredTileIds: ["0:0", "1:0", "1:1"],
        fogTileIds: ["2:2"],
      },
    },
  }),
  getAdditionalIndexes: () => ({
    worldsByPlayer: {
      "player:1": ["world:player:1"],
    },
  }),
});

console.log("WP-013 additional data bridge demo");
console.log("entity tables:", Object.keys(snapshot.entities));
console.log("index tables:", Object.keys(snapshot.indexes));
console.log("world payload:", snapshot.entities["worlds"]["world:player:1"]);
console.log("checksum:", snapshot.checksum);

