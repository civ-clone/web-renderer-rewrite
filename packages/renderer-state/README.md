# @civ-clone/renderer-state

> WP-006: Renderer State Store

Client-side state store for the Civ-Clone web renderer. Hydrates from engine `SnapshotEnvelope` messages and applies incremental `DeltaEnvelope` patches.

## Features

- **Hydration** — `store.hydrate(snapshot)` resets to a known-good state from the engine
- **Delta apply** — `store.applyDelta(delta)` applies incremental patches with version gap and mismatch detection
- **Entity lookups** — `getEntity(table, id)`, `listTable(table)`, `listTableIds(table)`
- **Index lookups** — `lookupIndex(indexName, key)`, `getIndex(indexName)`
- **Action accessors** — `getActionsForPlayer(playerId)`, `getRequirementsForPlayer(playerId)`, `getUnitActions(entityId)`
- **Catch-up window** — `getDeltasFrom(fromVersion)` for reconnecting clients; bounded to `maxDeltaWindow` (default 128)
- **Memory safe** — delta window is bounded; no unbounded growth over long replays

## Usage

```typescript
import { RendererStore } from "@civ-clone/renderer-state";

const store = new RendererStore();

// On full snapshot from engine:
store.hydrate(snapshotMessage);

// On incremental delta from engine:
const result = store.applyDelta(deltaMessage);
if (!result.ok) {
  if (result.reason === "gap") {
    // Request a resync snapshot from the engine
  }
}

// UI selectors:
const unit = store.getEntity("units", "unit:42");
const unitsForPlayer = store.lookupIndex("unitsByPlayer", "player:1");
const requirements = store.getRequirementsForPlayer("player:1");
```

## Patch operations supported

| op               | description                                     |
|------------------|-------------------------------------------------|
| `set`            | Set any scalar or object at a dot-separated path |
| `remove`         | Delete a key at a dot-separated path             |
| `arrayPush`      | Append a value to an array at a path             |
| `arrayRemoveItem`| Remove first occurrence of a value from an array |

Paths use dot-separation, e.g. `entities.units.unit:42.health`.

## Delta rejection reasons

| reason        | meaning                                              |
|---------------|------------------------------------------------------|
| `unhydrated`  | `hydrate()` has not been called yet                  |
| `mismatch`    | Delta's `matchId` doesn't match current store match  |
| `stale`       | Delta's `baseVersion` is behind current stateVersion |
| `gap`         | Delta's `baseVersion` is ahead — deltas were missed  |

