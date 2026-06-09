import type { StateEntities, StateIndexes } from "@civ-clone/protocol-state";

export interface AdditionalDataBridgeOptions {
  protectedEntityTables?: string[];
  protectedIndexes?: string[];
  allowProtectedOverride?: boolean;
}

export interface AdditionalDataBridgeResult {
  entities: StateEntities;
  indexes: StateIndexes;
}

function stableEntitiesClone(input: StateEntities): StateEntities {
  const output: StateEntities = {};

  for (const tableName of Object.keys(input).sort()) {
    output[tableName] = {};
    for (const key of Object.keys(input[tableName]).sort()) {
      output[tableName][key] = input[tableName][key];
    }
  }

  return output;
}

function stableIndexesClone(input: StateIndexes): StateIndexes {
  const output: StateIndexes = {};

  for (const indexName of Object.keys(input).sort()) {
    output[indexName] = {};
    for (const key of Object.keys(input[indexName]).sort()) {
      output[indexName][key] = [...input[indexName][key]];
    }
  }

  return output;
}

function assertNoProtectedCollisions(
  kind: "entity table" | "index",
  names: string[],
  protectedNames: string[],
  allowProtectedOverride: boolean
): void {
  if (allowProtectedOverride) {
    return;
  }

  for (const name of names) {
    if (protectedNames.includes(name)) {
      throw new Error(
        `AdditionalData bridge: dynamic ${kind} '${name}' collides with protected core name.`
      );
    }
  }
}

/**
 * Normalize dynamic AdditionalData tables/indexes into a deterministic structure.
 */
export function buildAdditionalDataBridge(params: {
  entities?: StateEntities;
  indexes?: StateIndexes;
  options?: AdditionalDataBridgeOptions;
}): AdditionalDataBridgeResult {
  const entities = params.entities ?? {};
  const indexes = params.indexes ?? {};
  const options = params.options ?? {};

  assertNoProtectedCollisions(
    "entity table",
    Object.keys(entities),
    options.protectedEntityTables ?? [],
    options.allowProtectedOverride === true
  );

  assertNoProtectedCollisions(
    "index",
    Object.keys(indexes),
    options.protectedIndexes ?? [],
    options.allowProtectedOverride === true
  );

  return {
    entities: stableEntitiesClone(entities),
    indexes: stableIndexesClone(indexes),
  };
}


