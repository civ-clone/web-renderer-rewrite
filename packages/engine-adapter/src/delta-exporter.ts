import {
  type DeltaEnvelope,
  type PatchOp,
  type SnapshotEnvelope,
} from "@civ-clone/protocol-state";

type DeltaSource = {
  turn: number;
  entities: SnapshotEnvelope["entities"];
  indexes: SnapshotEnvelope["indexes"];
  requirementsByPlayer: SnapshotEnvelope["requirementsByPlayer"];
  actionsByPlayer?: SnapshotEnvelope["actionsByPlayer"];
  unitActionsById?: SnapshotEnvelope["unitActionsById"];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isPrimitiveArray(value: unknown[]): boolean {
  return value.every(
    (item) => item === null || ["string", "number", "boolean"].includes(typeof item)
  );
}

function pathJoin(base: string, key: string): string {
  return base ? `${base}.${key}` : key;
}

function diffValues(
  patches: PatchOp[],
  path: string,
  previous: unknown,
  next: unknown
): void {
  if (Object.is(previous, next)) {
    return;
  }

  if (Array.isArray(previous) && Array.isArray(next)) {
    if (!isPrimitiveArray(previous) || !isPrimitiveArray(next)) {
      patches.push({ op: "set", path, value: next });
      return;
    }

    for (const item of previous) {
      if (!next.includes(item)) {
        patches.push({ op: "arrayRemoveItem", path, value: item });
      }
    }

    for (const item of next) {
      if (!previous.includes(item)) {
        patches.push({ op: "arrayPush", path, value: item });
      }
    }

    return;
  }

  if (isPlainObject(previous) && isPlainObject(next)) {
    const previousKeys = Object.keys(previous).sort();
    const nextKeys = Object.keys(next).sort();

    for (const key of previousKeys) {
      if (!(key in next)) {
        patches.push({ op: "remove", path: pathJoin(path, key) });
      }
    }

    for (const key of nextKeys) {
      const childPath = pathJoin(path, key);
      if (!(key in previous)) {
        patches.push({ op: "set", path: childPath, value: next[key] });
        continue;
      }

      diffValues(patches, childPath, previous[key], next[key]);
    }

    return;
  }

  patches.push({ op: "set", path, value: next });
}

function sourceFromSnapshot(snapshot: SnapshotEnvelope): DeltaSource {
  return {
    turn: snapshot.turn,
    entities: snapshot.entities,
    indexes: snapshot.indexes,
    requirementsByPlayer: snapshot.requirementsByPlayer,
    actionsByPlayer: snapshot.actionsByPlayer,
    unitActionsById: snapshot.unitActionsById,
  };
}

export class DeltaExporter {
  buildDelta(previous: SnapshotEnvelope, next: SnapshotEnvelope): DeltaEnvelope {
    if (previous.protocolVersion !== next.protocolVersion) {
      throw new Error("DeltaExporter: protocolVersion mismatch between snapshots.");
    }

    if (previous.matchId !== next.matchId) {
      throw new Error("DeltaExporter: matchId mismatch between snapshots.");
    }

    if (next.stateVersion <= previous.stateVersion) {
      throw new Error("DeltaExporter: next.stateVersion must be greater than previous.stateVersion.");
    }

    const patches: PatchOp[] = [];
    diffValues(patches, "", sourceFromSnapshot(previous), sourceFromSnapshot(next));

    return {
      protocolVersion: next.protocolVersion,
      matchId: next.matchId,
      baseVersion: previous.stateVersion,
      targetVersion: next.stateVersion,
      patches,
      resultChecksum: next.checksum,
    };
  }
}

