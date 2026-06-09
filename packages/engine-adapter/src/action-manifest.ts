import type {
  ActionManifestEntry,
  ActionManifestEnvelope,
  PlayerActionDescriptor,
  SnapshotEnvelope,
  UnitActionDescriptor,
} from "@civ-clone/protocol-state";

type ManifestAccumulator = Omit<ActionManifestEntry, "requiresValueRef" | "requiresUnitRef" | "requiresFromTileRef" | "requiresToTileRef"> & {
  requiresValueRef: boolean;
  requiresUnitRef: boolean;
  requiresFromTileRef: boolean;
  requiresToTileRef: boolean;
};

function entryKey(entry: Pick<ActionManifestEntry, "tier" | "actionType" | "mandatory" | "valueType">): string {
  return [
    entry.tier,
    entry.actionType,
    entry.mandatory ? "1" : "0",
    entry.valueType ?? "",
  ].join("|");
}

function upsertEntry(
  entriesByKey: Map<string, ManifestAccumulator>,
  entry: ManifestAccumulator
): void {
  const key = entryKey(entry);
  const existing = entriesByKey.get(key);

  if (!existing) {
    entriesByKey.set(key, entry);
    return;
  }

  existing.requiresValueRef = existing.requiresValueRef || entry.requiresValueRef;
  existing.requiresUnitRef = existing.requiresUnitRef || entry.requiresUnitRef;
  existing.requiresFromTileRef = existing.requiresFromTileRef || entry.requiresFromTileRef;
  existing.requiresToTileRef = existing.requiresToTileRef || entry.requiresToTileRef;
}

function fromPlayerDescriptor(descriptor: PlayerActionDescriptor): ManifestAccumulator {
  return {
    tier: "player",
    actionType: descriptor.actionType,
    mandatory: descriptor.mandatory,
    valueType: descriptor.valueType,
    requiresValueRef: descriptor.valueId !== undefined || descriptor.valueStableId !== undefined,
    requiresUnitRef: false,
    requiresFromTileRef: false,
    requiresToTileRef: false,
  };
}

function fromUnitDescriptor(descriptor: UnitActionDescriptor): ManifestAccumulator {
  return {
    tier: "unit",
    actionType: descriptor.actionType,
    mandatory: false,
    requiresValueRef: false,
    requiresUnitRef: descriptor.unitId !== undefined || descriptor.unitStableId !== undefined,
    requiresFromTileRef: descriptor.fromTileId !== undefined,
    requiresToTileRef: descriptor.toTileId !== undefined,
  };
}

function sortEntries(entries: ActionManifestEntry[]): ActionManifestEntry[] {
  return [...entries].sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier.localeCompare(b.tier);
    }

    if (a.actionType !== b.actionType) {
      return a.actionType.localeCompare(b.actionType);
    }

    if (a.mandatory !== b.mandatory) {
      return Number(b.mandatory) - Number(a.mandatory);
    }

    return (a.valueType ?? "").localeCompare(b.valueType ?? "");
  });
}

/**
 * Build a stable, de-duplicated action manifest from a snapshot's action descriptors.
 */
export function buildActionManifest(snapshot: SnapshotEnvelope): ActionManifestEnvelope {
  const entriesByKey = new Map<string, ManifestAccumulator>();

  for (const descriptors of Object.values(snapshot.actionsByPlayer ?? {})) {
    for (const descriptor of descriptors) {
      upsertEntry(entriesByKey, fromPlayerDescriptor(descriptor));
    }
  }

  for (const descriptors of Object.values(snapshot.unitActionsById ?? {})) {
    for (const descriptor of descriptors) {
      upsertEntry(entriesByKey, fromUnitDescriptor(descriptor));
    }
  }

  return {
    entries: sortEntries(Array.from(entriesByKey.values())),
  };
}

