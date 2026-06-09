# Pre-Planning Engineering Review: Findings and Recommendations

Status: Active  
Last updated: 2026-06-09

Source material:
- `docs/planning/source-model-audit.md`
- `docs/architecture/renderer-engine-protocol-v1.md`
- `docs/adr/renderer-engine-v1-decisions.md`
- `.github/agent-notes/civ-clone-source-context.md`

---

## Finding 1 (HIGH): Object graph actions are transport-hostile

**Problem**

`PlayerAction<T>` stores a full `Player` object reference and a rich `value: T` which can be
a `Unit`, `CityBuild`, `PlayerResearch`, `PlayerGovernment`, `Spaceship`, or `PlayerTradeRates`.
All of these are `DataObject` instances with methods, closures, and back-references to other
objects. Serializing them across any boundary (Worker, network, save/load) hits cycles
immediately.

Key files:
- `node_modules/@civ-clone/core-player/PlayerAction.ts` (lines 13, 16, 25)
- `node_modules/@civ-clone/core-player/MandatoryPlayerAction.ts`

**Recommendation**

Define a thin action DTO that replaces object refs with IDs and a type discriminant:

```ts
{ actionType: string, mandatory: boolean, valueType?: string, valueId?: string }
```

Build an adapter layer that converts live `PlayerAction` instances to this shape at the engine
boundary. The renderer sends back an `ActionCommand` carrying the same discriminants, and the
engine resolves the relevant live objects from its registries.

**Status:** Unresolved. See Finding 1 plan below.

---

---

## Finding 2 (HIGH): Runtime identity is process-local, not stable across sessions

**Problem**

`DataObject#id()` generates IDs from in-memory class name counters that reset each process:

```ts
className + '-' + (++idCache[className]).toString(36)
// e.g. "Unit-1", "City-2" — restarts from 1 on next run
```

This means IDs in a saved game file, replay, or network packet carry different meaning
across sessions. Any protocol that trusts `DataObject#id()` as a stable external key will
produce corrupt state after save/load or reconnect.

Key file:
- `node_modules/@civ-clone/core-data-object/DataObject.ts` (lines 33, 46, 147)

**Why this blocks other work:**
- Finding 1 (action DTO) uses `valueId` which today is `DataObject#id()` — safe within a session, broken across save/load.
- Finding 3 (registry projections) will export state by ID — needs stable keys.
- Finding 5 (action manifest) will reference entities by type+ID — needs stability.

**Recommendation: Dual-ID strategy**

Keep `DataObject#id()` as an internal, ephemeral runtime key (no changes needed). Assign a parallel **stable ID** at entity creation time:

```ts
// In each constructor, alongside existing DataObject init:
private stableId: string = generateStableId(this);

public getStableId(): string {
  return this.stableId;
}
```

The stable ID can be generated three ways (choose one per entity type):

### Option A: UUID v4 (universal, no context)

```ts
stableId = crypto.randomUUID(); // e.g. "550e8400-e29b-41d4-a716-446655440000"
```

**Pros:** collision-proof, compact binary representation possible.  
**Cons:** non-deterministic (hard to replay from seed), takes more bytes.  
**Best for:** units, cities, transient entities not critical to determinism.

### Option B: Semantic key (deterministic, replay-safe)

Based on stable facts about the entity:

**Tile:** Use coordinates directly: `"tile:${x}:${y}"` (no ID needed, coords are the key).  
**Player:** Use civilization name + start position: `"player:${civilizationId}:${hashOf(startPosition)}"`.  
**Unit:** Use creation turn + serial counter: `"unit:${createdOnTurn}:${serialNumber}"`.  
**City:** Use tile + creation turn: `"city:${tileTileId}:${createdOnTurn}"`.

**Pros:** deterministic, human-readable, replay-safe, compact.  
**Cons:** requires stable generation rules, must handle collisions.  
**Best for:** map tiles, players, anything needed for deterministic replay.

### Option C: Hybrid (semantic for critical, UUID for convenience)

Use semantic keys for:
- Tiles (always `${x}:${y}`)
- Players (civilization + seed hash)

Use UUID v4 for:
- Units (created dynamically, less critical to replay)
- Cities (created dynamically)

**Pros:** best of both worlds — zero collisions, partially deterministic.  
**Cons:** mixed formats in protocol.

**Implication for Finding 1 (Action DTO)**

Update `ActionCommand` to carry **both** ephemeral and stable IDs during the transition:

```ts
interface ActionCommand {
  // ...existing fields...
  // Ephemeral (valid within session only)
  valueId?: EntityId;        // DataObject#id(), e.g. "Unit-1"
  // Stable (valid across sessions)
  valueStableId?: EntityId;  // Stable ID, e.g. "unit:42:3"
}
```

During the transition (before Finding 2 is fully deployed):
- Engine accepts both `valueId` and `valueStableId`.
- Prefers `valueStableId` if present; falls back to `valueId`.
- Snapshots include both (for debugging + backward compat).

Once all clients and saves are migrated to stable IDs:
- Drop the ephemeral IDs from the protocol.
- Keep `DataObject#id()` internal only.

### Implementation plan for Finding 2

1. **Choose stable ID strategy** (recommend: Hybrid — semantic for tiles/players, UUID for units/cities).

2. **Add `stableId` field to all `DataObject` subclasses:**
   - Player
   - Unit
   - City
   - Tile
   - And any other entity exposed to the protocol.

3. **Implement stable ID generation:**
   - Option A: `crypto.randomUUID()` + store in entity.
   - Option B: `generateSemanticId(this)` function that inspects entity type + properties.
   - Inject the strategy via constructor or a factory.

4. **Export stable IDs in protocol:**
   - Add `stableIds` table to `SnapshotEnvelope.entities`: `{ tableName: { stableId: entityId, ... } }`
   - Or add `id` and `stableId` fields to each entity record.
   - Update `StateIndexes` to key by stable IDs: `{ indexName: { key: stableId[] } }`

5. **Update action DTO (Finding 1) to use stable IDs:**
   - `PlayerActionDescriptor.valueId` becomes `PlayerActionDescriptor.valueStableId`.
   - `UnitActionDescriptor.unitId` becomes `UnitActionDescriptor.unitStableId`.
   - `UnitActionDescriptor.fromTileId` / `toTileId` use `${x}:${y}` (already stable).

6. **Update ActionCommand:**
   - Accept `valueStableId`, `unitStableId` instead of ephemeral IDs.
   - Engine resolves by stable ID from internal registry.

7. **Tests:**
   - Stable IDs survive save/load (serialize + deserialize).
   - Stable IDs are deterministic (for Option B).
   - No collisions across entities of the same type.
   - Protocol can round-trip stable IDs without corruption.

### Deferred decisions

- **Persistence format:** How are stable IDs stored in save games? (e.g., in entity blob + indexed separately)
- **Migration script:** How to assign stable IDs to existing saves? (generate UUIDs + log mapping)
- **Replay guarantees:** If Option B (semantic), what RNG seed ensures determinism?

### Coupling to other findings

- **Finding 1 (action DTO):** Unblocked once stable IDs are available. Can work in parallel with ephemeral IDs.
- **Finding 3 (registry projections):** Needs stable IDs to build stable indexes.
- **Finding 4 (determinism):** Depends on stable RNG seeding, which depends on stable player IDs.
- **Finding 5 (action manifest):** Can reference actions by type + (player stable ID, action type).

---

## Finding 3 (HIGH): Registry lookups are object-identity based, not ID/index based

**Problem**

All `EntityRegistry` querying compares object references (`===`) via `getBy()` method:

```ts
getBy<K extends keyof T>(key: K, value: T[K]): T[] {
  return this.filter((entity: T): boolean => {
    const check = entity[key];
    if (check instanceof Function) {
      return check.bind(entity)() === value;  // === comparison!
    }
    return entity[key] === value;
  });
}
```

Example: `UnitRegistry.getByPlayer(player)` walks all units comparing `unit.player() === player`.

This is correct for internal rule execution (identity is meaningful at that scope), but it
blocks protocol export. To build delta/snapshot exports keyed by stable entity IDs, we need
ID-indexed projections alongside the original object-identity registries.

Key files:
- `node_modules/@civ-clone/core-registry/EntityRegistry.ts` (line 55)
- `node_modules/@civ-clone/core-unit/UnitRegistry.ts` (line 35)
- `node_modules/@civ-clone/core-city/CityRegistry.ts` (line 27)

35 registry classes across core-* packages (UnitRegistry, CityRegistry, PlayerRegistry,
PlayerResearchRegistry, SpaceshipRegistry, etc.).

**Recommendation: Projection layer**

Keep registries unchanged (engine rules depend on them). Build lightweight ID-indexed
projections for protocol export:

```ts
// Protocol exporter builds these on-demand:
const unitsByStableId = new Map<StableEntityId, Unit>();
const unitsByPlayer = new Map<StableEntityId, StableEntityId[]>();

// Populate from engine registries at snapshot time
unitRegistry.entries().forEach(unit => {
  const stableId = unit.getStableId();
  unitsByStableId.set(stableId, unit);
  const playerStableId = unit.player().getStableId();
  if (!unitsByPlayer.has(playerStableId)) {
    unitsByPlayer.set(playerStableId, []);
  }
  unitsByPlayer.get(playerStableId)!.push(stableId);
});
```

Export format (SnapshotEnvelope):

```ts
{
  entities: {
    units: {
      "unit:42:3": { ... unit state ... },
      "unit:43:2": { ... },
    }
  },
  indexes: {
    unitsByPlayer: {
      "player:romans:seed123": ["unit:42:3", "unit:43:2"],
    }
  }
}
```

This projection layer is **read-only at export time** — no mutation of engine state.

**Implementation plan for Finding 3**

1. After Finding 2 (stable IDs) lands: each entity has `getStableId()` method.

2. In snapshot exporter (new work):
   - For each registryinstance (UnitRegistry, CityRegistry, etc.):
     - Iterate `registry.entries()`
     - Call `entity.getStableId()`
     - Populate ID-keyed map in `entities` table
     - Populate secondary indexes (e.g. `unitsByPlayer`) in `indexes`

3. At runtime:
   - Registry lookups for rules: unchanged (use object identity as before).
   - Snapshot export: walk registries, build ID projections.
   - Delta export: diff projections, emit patches keyed by stable IDs.

4. Tests:
   - Projection completeness (all entities exported once).
   - Index correctness (e.g., `unitsByPlayer["player:X"]` contains all units of that player).
   - Stability (same export, same indexes).
   - No mutations to engine state during export.

**Status:** Ready for implementation once Finding 2 (stable IDs) ships.

---

## Finding 4 (HIGH): Non-deterministic RNG for multiplayer/replay

**Problem**

Core domain logic uses `Math.random()` directly without seeding:

```ts
// Spaceship.ts, line 114
this.#successful = this.chanceOfSuccess() > this.#randomNumberGenerator();

// PlayerTradeRates.ts, line 52
others[Math.floor(others.length * Math.random())].add(...)
```

And other places. In single-player this is fine. But for multiplayer peer-to-peer or
server-authoritative games, or for replay determinism, all clients must compute the same
outcome from the same input state.

**Recommendation: Seeded RNG injection**

1. **Create a SeededRNG service:**

```ts
export interface SeededRNG {
  seed: string;  // e.g. hex(sha256("match-abc" + turn))
  next(): number;  // returns [0, 1)
  nextInt(max: number): number;
}

export class DeterministicRNG implements SeededRNG {
  private state: bigint;
  constructor(seed: string) {
    this.state = BigInt('0x' + seed.substring(0, 16));
  }
  next(): number {
    // xorshift64* or similar
    this.state ^= this.state << 13n;
    this.state ^= this.state >> 7n;
    return Number((this.state & 0xffffffffn) / 0x100000000);
  }
}
```

2. **Inject into affected entities:**

   Update constructors that use RNG to accept an injectable:
   - `Spaceship(player, ..., rng: SeededRNG = defaultRng)` ← already supports this!
   - `PlayerTradeRates(player, ...rates, rng: SeededRNG = defaultRng)` ← add this

3. **Engine initialization:**

   At match start, derive a seeded RNG from match state:

```ts
const rng = new DeterministicRNG(
  sha256(`${matchId}-${turn}-${playerSeq}`)
);
spaceship = new Spaceship(player, layout, ..., rng);
```

4. **Bonus: Spaceship already has injectable RNG:**

   Line 59 of Spaceship.ts:
   ```ts
   randomNumberGenerator: () => number = () => Math.random()
   ```

   This is the pattern to follow for other stochastic classes.

**Status:** Moderate effort; very high impact for multiplayer. Can start immediately.

---

## Finding 5 (MEDIUM): Mandatory/optional semantics are class-derived, not explicit metadata

**Problem**

Whether an action blocks turn end is determined at runtime by `instanceof MandatoryPlayerAction`.
Rules generate actions dynamically, and there's no static action manifest — protocol can't
enumerate what actions are possible without running the rule engine.

Key file:
- `node_modules/@civ-clone/core-player/Player.ts` (lines 70, 92)

**Why this matters for Finding 1:**

Finding 1 (action DTO) populates `actionsByPlayer` at snapshot time. To do this robustly,
we need to know which actions are mandatory. Today we inspect the class at runtime; an
explicit manifest would make the contract clearer.

**Recommendation: Action manifest extractor**

Build a helper that introspects the rule engine's action rules and produces a static manifest:

```ts
interface ActionManifestEntry {
  actionType: string;  // class name
  mandatory: boolean;  // extends MandatoryPlayerAction?
  valueType?: string;  // generic type parameter, if any
  description?: string;
}

// Returns array of all possible PlayerActions
function extractActionManifest(ruleRegistry: RuleRegistry): ActionManifestEntry[] {
  const actionRules = ruleRegistry.get(Action); // core-player/Rules/Action
  const manifest: Set<ActionManifestEntry> = new Set();

  actionRules.forEach(rule => {
    const effects = rule.effects(); // or similar introspection
    effects.forEach(effect => {
      const actions = effect.perform(...);  // call with dummy args?
      actions.forEach(action => {
        manifest.add({
          actionType: action.constructor.name,
          mandatory: action instanceof MandatoryPlayerAction,
          valueType: action.value()?.constructor?.name,
        });
      });
    });
  });

  return Array.from(manifest);
}
```

This is a **best-effort tool** — not bulletproof, since some actions are generated
conditionally. But it captures the common cases.

**Implementation plan for Finding 5**

1. After Finding 1 ships: integrate manifest extractor into snapshot exporter.

2. Add optional `actionManifest` to `SnapshotEnvelope`:

```ts
{
  protocolVersion: "1.0",
  ...
  actionManifest: [
    { actionType: "EndTurn", mandatory: true },
    { actionType: "ActiveUnit", mandatory: true, valueType: "Unit" },
    { actionType: "InactiveUnit", mandatory: false, valueType: "Unit" },
    ...
  ]
}
```

3. Renderer/debugger can use this to validate incoming action descriptors.

**Status:** Low priority; mostly a documentation/validation tool. Deferred until Finding 1 is stable.

---

## Finding 6 (MEDIUM): Singleton registries increase global state risk

**Problem**

Every domain registry exports a shared instance:

```ts
export const instance: UnitRegistry = new UnitRegistry();
export const instance: PlayerRegistry = new PlayerRegistry();
export const instance: SpaceshipRegistry = new SpaceshipRegistry();
// ... 35+ instances across all packages
```

In a single-player game, this is fine. But in test suites, server-multiplayer, or any
scenario with multiple concurrent matches, these singletons accumulate state. No reset
API is exposed, so tests must either:
- Restart the entire Node process (expensive).
- Manually clear registries (error-prone, requires knowledge of all 35 registries).
- Accept leaky tests (dangerous).

Key observation: Found 22 registry classes with singleton `instance` exports.

**Recommendation: Registry lifecycle container**

Create a per-match registry container that singletons can delegate to:

```ts
export class RegistryContainer {
  private unitRegistry = new UnitRegistry();
  private playerRegistry = new PlayerRegistry();
  private spaceshipRegistry = new SpaceshipRegistry();
  // ... all 22 registries

  getUnitRegistry() { return this.unitRegistry; }
  getPlayerRegistry() { return this.playerRegistry; }
  // ...

  reset() {
    // Clear all registries
    [this.unitRegistry, this.playerRegistry, ...].forEach(reg => {
      reg.entries().forEach(ent => reg.unregister(ent));
    });
  }
}

export const currentMatch = new ContextVar<RegistryContainer>('match');

// Usage:
const container = new RegistryContainer();
currentMatch.run(container, () => {
  // All registry accesses go to container
  const units = unitRegistry.entries(); // delegates to container
});
container.reset(); // clean up for next match
```

Alternatively, a simpler approach: make the singleton pattern explicit with a reset hook:

```ts
export class PlayerRegistry ... {
  static #instance: PlayerRegistry;
  static getInstance() {
    if (!this.#instance) this.#instance = new PlayerRegistry();
    return this.#instance;
  }
  static reset() {
    if (this.#instance) {
      this.#instance.entries().forEach(e => this.#instance!.unregister(e));
    }
  }
}

// In test setup:
beforeEach(() => {
  [PlayerRegistry, UnitRegistry, CityRegistry, ...].forEach(Reg => Reg.reset());
});
```

**Implementation plan for Finding 6**

1. **Phase 1 (low effort):** Add a `reset()` method to each of the 22 registry classes.
   - Iterate entries and unregister all.
   - Use in `beforeEach()` hooks in tests.

2. **Phase 2 (deferred):** If multiplayer server is built, introduce RegistryContainer for
   per-match isolation.

3. **Tests:**
   - Verify registries are empty after reset.
   - Test fixture isolation: two matches don't share state.

**Status:** Phase 1 is quick (add reset methods); Phase 2 deferred for multiplayer work.

---

## Revised status and priority

| # | Severity | Finding | Status | Ready for | Blocker for |
|---|---|---|---|---|---|
| 1 | HIGH | Object graph actions | Spec'd ✅ | WP-002 | Finding 5 |
| 2 | HIGH | Stable IDs | Spec'd ✅ | WP-002b | Finding 3, 5 |
| 3 | HIGH | Registry projections | **Spec'd ✅** | WP-004 | Delta export |
| 4 | HIGH | Deterministic RNG | **Spec'd ✅** | WP-006 | Multiplayer |
| 5 | MEDIUM | Action manifest | Spec'd (deferred) | After WP-002 | Validator |
| 6 | MEDIUM | Singleton lifecycle | **Spec'd ✅** | WP-007 | Testing |

All findings are now fully documented with implementation plans and design choices locked in.

---

## Finding 3 (HIGH): Registry lookups are object-identity based, not ID/index based

**Problem**

All `EntityRegistry` querying compares object references (`===`). State diffing, delta
generation, and normalization all need ID-addressable projections instead.

Key files:
- `node_modules/@civ-clone/core-registry/EntityRegistry.ts` (line 55)
- `node_modules/@civ-clone/core-unit/UnitRegistry.ts` (line 35)
- `node_modules/@civ-clone/core-city/CityRegistry.ts` (line 27)

**Recommendation**

Build lightweight ID-indexed projection maps alongside the existing registries for the
protocol boundary. Keep the original registries unchanged (engine uses them for rules). The
snapshot exporter maintains its own `Map<string, EntityState>` keyed by stable protocol IDs.

**Status:** Unresolved. Depends on Finding 2 (stable IDs).

---

## Finding 4 (HIGH): Determinism risk for multiplayer/replay

**Problem**

`Math.random()` is used directly in core domain logic:

- Spaceship chance-of-success calculation: `node_modules/@civ-clone/core-spaceship/Spaceship.ts` (lines 59, 114)
- Trade rate balancing: `node_modules/@civ-clone/core-trade-rate/PlayerTradeRates.ts` (line 52)

Peer/replay clients executing the same rule set will diverge unless a shared, seeded RNG is
injected. The codebase already accepts an injectable `randomNumberGenerator` on `Spaceship`,
so the pattern exists but is not yet enforced.

**Recommendation**

Mandate seeded RNG injection for all rules and domain logic on multiplayer/replay paths.
Establish a protocol-level seeded RNG format (e.g. initial seed in match state).

**Status:** Unresolved (but Spaceship already has injectable pattern as reference).

---

## Finding 5 (MEDIUM): Mandatory/optional semantics are class-derived, not explicit metadata

**Problem**

Whether an action blocks turn end is determined at runtime by `instanceof MandatoryPlayerAction`.
This is correct but requires executing rules to determine action set, with no static manifest.

Key files:
- `node_modules/@civ-clone/core-player/Player.ts` (lines 70, 92)
- `node_modules/@civ-clone/civ1-unit/Rules/Player/Action.ts` (line 32)

**Recommendation**

Build an action manifest extractor (runs engine-side, produces `ActionDescriptor[]`) rather
than serializing raw action instances. This is already modelled in
`packages/protocol-state/src/types.ts` as `ActionDescriptor`.

**Status:** Partially modelled. Needs extractor implementation.

---

## Finding 6 (MEDIUM): Singleton registries increase global state risk

**Problem**

Most domain registries export a shared `instance`:
- `node_modules/@civ-clone/core-player/PlayerRegistry.ts` (line 20)
- `node_modules/@civ-clone/core-unit/UnitRegistry.ts` (line 47)
- `node_modules/@civ-clone/core-science/PlayerResearchRegistry.ts` (line 31)

In tests and multi-match server scenarios, these singletons accumulate state between runs
unless explicitly reset. No reset/lifecycle API is currently visible.

**Recommendation**

Define a per-match registry container (or at minimum a reset function) so that match
lifecycle can be controlled without restarting the process.

**Status:** Unresolved.

---

## Severity summary

| # | Severity | Finding | Depends on |
|---|---|---|---|
| 1 | HIGH | Object graph actions transport-hostile | — |
| 2 | HIGH | Runtime identity not stable | — |
| 3 | HIGH | Registry lookups object-identity based | Finding 2 |
| 4 | HIGH | Non-deterministic RNG | — |
| 5 | MEDIUM | Mandatory/optional class-derived, no manifest | Finding 1 |
| 6 | MEDIUM | Singleton registry global state | — |

## Recommended work order

1. Finding 2 first (stable IDs) — unblocks Finding 3 and Finding 1 adapter design.
2. Finding 1 (action DTO) — enables clean boundary contract; Finding 5 then follows naturally.
3. Finding 4 (determinism) — can run in parallel; low code surface.
4. Finding 3 (registry projections) — after stable IDs land.
5. Finding 6 (singleton lifecycle) — before serious multiplayer/test work.
5. Finding 5 (action manifest extractor) — after Finding 1.

---

## Finding 1 Plan: Action DTO / Transport Boundary

### There are two distinct action tiers

Investigation reveals the engine has two separate action models, not one:

**Tier 1 — Player-level actions** (`PlayerAction<T>` in `core-player/PlayerAction.ts`)

These represent decisions the player must make or can make each turn:

| Action type | Mandatory? | `value()` type | Source |
|---|---|---|---|
| `EndTurn` | Yes | `null` | `base-player-action-end-turn` |
| `ChooseResearch` | Yes | `PlayerResearch` | `library-science` |
| `ActiveUnit` | Yes | `Unit` | `base-player-action-active-unit` |
| `CityBuild` | Yes | `CityBuild` | `core-city-build/PlayerActions/CityBuild.ts` |
| `InactiveUnit` | No | `Unit` | `base-player-action-inactive-unit` |
| `Revolution` | No | `PlayerGovernment` | `base-player-action-revolution` |
| `AdjustTradeRates` | No | `PlayerTradeRates` | `base-player-action-adjust-trade-rates` |
| `LaunchSpaceship` | No | `Spaceship` | `base-player-action-launch-spaceship` |
| `CompleteProduction` | No | `CityBuild` | `civ1-treasury` |
| `ChangeProduction` | No | `CityBuild` | `core-city-build` |

`EndTurn` is generated automatically when no mandatory actions remain (lowest rule priority).

**Tier 2 — Unit-level actions** (`Action` in `core-unit/Action.ts`)

These represent moves a specific unit can make on a specific tile transition.
They carry `from: Tile`, `to: Tile`, `unit: Unit` — not a player reference.

Available unit actions (from `library-unit`):

`Move`, `Attack`, `SneakAttack`, `Fortify`, `FoundCity`, `BuildRoad`, `BuildRailroad`,
`BuildIrrigation`, `BuildMine`, `ClearForest`, `ClearJungle`, `ClearSwamp`, `PlantForest`,
`CaptureCity`, `SneakCaptureCity`, `Disband`, `Disembark`, `Embark`, `Unload`, `GoTo`,
`Sleep`, `NoOrders`, `Pillage`, `SetHomeCity`

Unit actions are exposed via `Unit.actions(to?, from?)` and are surfaced via
`ActiveUnit` (player action) → renderer shows available unit actions → renderer sends choice back.

### Problem in detail

Current flow:

```
player.actions()       -> PlayerAction<T>[] (Player obj + T obj, cyclic)
unit.actions(to, from) -> Action[]          (Tile + Unit objs, cyclic)
                          -> renderer (cyclic graph, memory leaks on unpack)
```

We need:

```
player.actions()       -> PlayerAction<T>[]  -> adapter -> PlayerActionDescriptor[] (plain DTO)
unit.actions(to, from) -> Action[]           -> adapter -> UnitActionDescriptor[]   (plain DTO)
                          -> renderer (ID refs only, no cycles)
renderer -> ActionCommand (discriminated by tier + type, ID refs) -> engine resolves objs
```

### DTO shapes (two types needed)

**Player action descriptor** (already partially in `packages/protocol-state/src/types.ts`):

```ts
interface PlayerActionDescriptor {
  tier: "player";
  actionType: string;      // class name, e.g. "ChooseResearch", "ActiveUnit"
  mandatory: boolean;
  valueType?: string;      // class name of value(), e.g. "PlayerResearch", "Unit"
  valueId?: string;        // DataObject#id() of value()
}
```

**Unit action descriptor** (new — needs adding to types):

```ts
interface UnitActionDescriptor {
  tier: "unit";
  actionType: string;      // class name, e.g. "Move", "Attack", "Fortify"
  unitId: string;          // DataObject#id() of the unit
  fromTileId: string;      // DataObject#id() of from tile
  toTileId?: string;       // DataObject#id() of to tile (most actions use this)
}
```

**ActionCommand from renderer** needs to carry the tier discriminant so the engine knows
which resolution path to take:

```ts
interface ActionCommand {
  tier: "player" | "unit";
  actionType: string;
  // player tier
  valueType?: string;
  valueId?: string;
  // unit tier
  unitId?: string;
  fromTileId?: string;
  toTileId?: string;
}
```

### Adapter API (engine-side)

```ts
function describePlayerAction(action: PlayerAction): PlayerActionDescriptor {
  const value = action.value();
  return {
    tier: "player",
    actionType: action.constructor.name,
    mandatory: action instanceof MandatoryPlayerAction,
    valueType: value?.constructor?.name,
    valueId: value instanceof DataObject ? value.id() : undefined,
  };
}

function describeUnitAction(action: UnitCoreAction): UnitActionDescriptor {
  return {
    tier: "unit",
    actionType: action.constructor.name,
    unitId: action.unit().id(),
    fromTileId: action.from().id(),
    toTileId: action.to()?.id(),
  };
}
```

Engine resolution on `ActionCommand` receipt:

- `tier: "player"` → match by `(actionType, valueId)` in player's action list.
- `tier: "unit"` → look up unit by `unitId`, then find matching action by `(actionType, fromTileId, toTileId)`.

### Operational flow and renderer linkage

When a player can make a turn decision, the engine sends:

1. `PlayerAction.ActiveUnit` with `valueId: "Unit-42"` (which unit can they activate?)
2. Corresponding `UnitActionDescriptor[]` under `unitActionsById["Unit-42"]`
3. Renderer displays those unit actions to the player
4. Player selects one → renderer sends `ActionCommand(tier: "unit", unitId: "Unit-42", actionType: "Fortify", ...)`
5. Engine processes, updates state, moves to next active unit (next `ActiveUnit` or `InactiveUnit` or `EndTurn`)

The invariant is: **if `PlayerAction.ActiveUnit` carries `valueId: "Unit-X"`, then `unitActionsById["Unit-X"]` will be populated and non-empty** (at minimum containing `NoOrders`).

Currently unit actions are generated for all active units when the snapshot is exported. This could be optimized to on-demand (renderer sends `requestUnitActions(unitId)`) without changing the DTO shape — it's just a matter of engine resource allocation.

### Mandatory action enforcement

The turn-end gate is simple:
- If any `MandatoryPlayerAction` remains in `actionsByPlayer[playerId]`, turn cannot end.
- `ActiveUnit` is mandatory — the player must activate a unit.
- Once a unit is active, they must perform a valid action on it (e.g., `Move`, `Fortify`, `NoOrders`) — but that's rule-validated, not contractual.

The specific unit action choice (`Fortify` vs `NoOrders`) is optional; what's mandatory is that *some* valid action is performed.

### Coupling to Finding 2

Both `valueId` and `unitId`/`fromTileId`/`toTileId` today use `DataObject#id()` which is
process-local. The adapter can use `DataObject#id()` within a single session safely. Stable
IDs (Finding 2) must precede save/load and reconnect features.

### Decoupling note: tile IDs

Tiles are special — their natural identity is `(x, y)`. A tile's `DataObject#id()` is
ephemeral (e.g. `Tile-5184`), but `(x, y)` is stable and determinate. For tile references
specifically, we should use `"${x}:${y}"` as the stable key even before Finding 2 lands.
This is a partial mitigation with no extra work.

### Implementation steps for Finding 1

1. Update `packages/protocol-state/src/types.ts`: ✅ Done
   - Add `UnitActionDescriptor` interface.
   - Add `tier` discriminant to action types.
   - Extend `ActionCommand` with tier and unit/tile fields.
   - Add `unitActionsById` to `SnapshotEnvelope`.

2. Add adapter functions (engine-side boundary package — **new work**):
   - `describePlayerAction(action: PlayerAction): PlayerActionDescriptor`
   - `describeUnitActions(unit: Unit): UnitActionDescriptor[]` — compute at snapshot time (or defer to on-demand)
   - `describeActionsForPlayer(player: Player): PlayerActionDescriptor[]` — wrap `player.actions()`

3. Update snapshot exporter:
   - Populate `actionsByPlayer` from `Player#actions()` + descriptors.
   - Populate `unitActionsById` from active units + descriptors (or leave empty for on-demand).

4. On `ActionCommand` receipt, engine resolves via tier-specific lookup:
   - `tier: "player"` → find action in player's list by `(actionType, valueId)` and execute.
   - `tier: "unit"` → resolve unit, find action in unit's list by `(actionType, fromTileId, toTileId)`, execute.

5. Tests (in new boundary package): 
   - mandatory/optional flag accuracy.
   - player action descriptor round-trip (within session).
   - unit action descriptor round-trip (within session).
   - tile coord stability (x:y format).
   - action resolution on command receipt.

### Deferred

- Save/load identity stability (Finding 2 prerequisite).
- Full strict Zod schemas for `PlayerActionDescriptor` / `UnitActionDescriptor` variants.
- Unit action validation (FindCity only on settler etc.) — engine validates, renderer can preflight optionally.
- On-demand unit action generation (optimizable later; currently batch at snapshot time).






