import type {
  ActionCommand,
  EntityState,
  UnitActionDescriptor,
} from "@civ-clone/protocol-state";

export type MigrationTile = {
  x(): number;
  y(): number;
};

export type MigrationPlayer = {
  id(): string;
  getStableId?: () => string;
};

export type MigrationUnitAction = {
  constructor: { name: string };
  unit(): MigrationUnit;
  from(): MigrationTile;
  to(): MigrationTile;
};

export type MigrationUnit = {
  id(): string;
  getStableId?: () => string;
  player(): MigrationPlayer;
  tile(): MigrationTile;
  actions(): MigrationUnitAction[];
  actionsForNeighbours(from: MigrationTile): Record<string, MigrationUnitAction[]>;
};

export type MigrationCity = {
  id(): string;
  getStableId?: () => string;
  player(): MigrationPlayer;
};

export interface UnitsMigrationAdapter {
  toUnitRecord(unit: MigrationUnit): EntityState;
  describeUnitActions(unit: MigrationUnit): UnitActionDescriptor[];
  resolveUnitActions(
    command: ActionCommand,
    legacyActions: MigrationUnitAction[]
  ): MigrationUnitAction[];
}

export interface CitiesMigrationAdapter {
  toCityRecord(city: MigrationCity): EntityState;
}


