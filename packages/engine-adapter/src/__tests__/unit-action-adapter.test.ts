import { describe, it, expect } from "vitest";
import { describeUnitAction, describeUnitActions } from "../unit-action-adapter.js";

function makeTileStub(x: number, y: number) {
  return { x: () => x, y: () => y };
}

type UnitStub = {
  id: () => string;
  getStableId?: () => string;
};

function makeUnitStub(unitId: string, stableId?: string): UnitStub {
  const stub: UnitStub = { id: () => unitId };

  if (stableId !== undefined) {
    stub.getStableId = () => stableId;
  }

  return stub;
}

function makeActionStub(
  actionType: string,
  unit: UnitStub,
  fromTile: { x: () => number; y: () => number },
  toTile: { x: () => number; y: () => number }
) {
  const ActionClass = { [actionType]: class {} }[actionType];
  const stub = Object.create(ActionClass.prototype) as {
    unit: () => UnitStub;
    from: () => { x: () => number; y: () => number };
    to: () => { x: () => number; y: () => number };
  };

  Object.assign(stub, {
    unit: () => unit,
    from: () => fromTile,
    to: () => toTile,
  });

  return stub;
}

function makeUnitWithActions(
  unitId: string,
  fromTile: { x: () => number; y: () => number },
  inPlaceActions: unknown[],
  neighbourActions: Record<string, unknown[]>,
  stableId?: string
) {
  const unitStub = makeUnitStub(unitId, stableId);

  return {
    ...unitStub,
    tile: () => fromTile,
    actions: () => inPlaceActions,
    actionsForNeighbours: (_from: unknown) => neighbourActions,
  };
}

const tile_3_4 = makeTileStub(3, 4);
const tile_3_5 = makeTileStub(3, 5);
const tile_4_4 = makeTileStub(4, 4);

describe("describeUnitAction movement", () => {
  it("sets tier to unit", () => {
    const action = makeActionStub("Move", makeUnitStub("Unit-1"), tile_3_4, tile_3_5);

    expect(describeUnitAction(action as never).tier).toBe("unit");
  });

  it("derives actionType from constructor name", () => {
    const action = makeActionStub("Move", makeUnitStub("Unit-1"), tile_3_4, tile_3_5);

    expect(describeUnitAction(action as never).actionType).toBe("Move");
  });

  it("always sets mandatory false", () => {
    const action = makeActionStub("Move", makeUnitStub("Unit-1"), tile_3_4, tile_3_5);

    expect(describeUnitAction(action as never).mandatory).toBe(false);
  });

  it("sets unitId from unit.id()", () => {
    const action = makeActionStub("Move", makeUnitStub("Unit-42"), tile_3_4, tile_3_5);

    expect(describeUnitAction(action as never).unitId).toBe("Unit-42");
  });

  it("sets fromTileId as x:y", () => {
    const action = makeActionStub("Move", makeUnitStub("Unit-1"), tile_3_4, tile_3_5);

    expect(describeUnitAction(action as never).fromTileId).toBe("3:4");
  });

  it("sets toTileId when from and to differ", () => {
    const action = makeActionStub("Move", makeUnitStub("Unit-1"), tile_3_4, tile_3_5);

    expect(describeUnitAction(action as never).toTileId).toBe("3:5");
  });

  it("distinguishes different tiles", () => {
    const action = makeActionStub("Move", makeUnitStub("Unit-1"), tile_3_4, tile_4_4);
    const descriptor = describeUnitAction(action as never);

    expect(descriptor.fromTileId).toBe("3:4");
    expect(descriptor.toTileId).toBe("4:4");
  });
});

describe("describeUnitAction in-place", () => {
  it("omits toTileId for in-place", () => {
    const action = makeActionStub("Fortify", makeUnitStub("Unit-1"), tile_3_4, tile_3_4);

    expect(describeUnitAction(action as never).toTileId).toBeUndefined();
  });

  it("still sets fromTileId", () => {
    const action = makeActionStub("Sleep", makeUnitStub("Unit-1"), tile_3_4, tile_3_4);

    expect(describeUnitAction(action as never).fromTileId).toBe("3:4");
  });
});

describe("describeUnitAction stable ID hook", () => {
  it("leaves unitStableId undefined without getStableId", () => {
    const action = makeActionStub("Move", makeUnitStub("Unit-1"), tile_3_4, tile_3_5);

    expect(describeUnitAction(action as never).unitStableId).toBeUndefined();
  });

  it("populates unitStableId from getStableId", () => {
    const action = makeActionStub("Move", makeUnitStub("Unit-1", "unit:42:3"), tile_3_4, tile_3_5);

    expect(describeUnitAction(action as never).unitStableId).toBe("unit:42:3");
  });
});

describe("describeUnitActions full list", () => {
  it("includes in-place at start", () => {
    const fortify = makeActionStub("Fortify", makeUnitStub("Unit-1"), tile_3_4, tile_3_4);
    const unit = makeUnitWithActions("Unit-1", tile_3_4, [fortify], {});
    const descriptors = describeUnitActions(unit as never);

    expect(descriptors).toHaveLength(1);
    expect(descriptors[0].actionType).toBe("Fortify");
    expect(descriptors[0].toTileId).toBeUndefined();
  });

  it("appends neighbour actions after in-place", () => {
    const fortify = makeActionStub("Fortify", makeUnitStub("Unit-1"), tile_3_4, tile_3_4);
    const move = makeActionStub("Move", makeUnitStub("Unit-1"), tile_3_4, tile_3_5);
    const unit = makeUnitWithActions("Unit-1", tile_3_4, [fortify], { n: [move] });
    const descriptors = describeUnitActions(unit as never);

    expect(descriptors).toHaveLength(2);
    expect(descriptors[0].actionType).toBe("Fortify");
    expect(descriptors[1].actionType).toBe("Move");
    expect(descriptors[1].toTileId).toBe("3:5");
  });

  it("flattens multiple neighbour directions", () => {
    const unitStub = makeUnitStub("Unit-1");
    const northMove = makeActionStub("Move", unitStub, tile_3_4, tile_3_5);
    const eastMove = makeActionStub("Move", unitStub, tile_3_4, tile_4_4);
    const unit = makeUnitWithActions("Unit-1", tile_3_4, [], { n: [northMove], e: [eastMove] });
    const descriptors = describeUnitActions(unit as never);

    expect(descriptors).toHaveLength(2);
    expect(descriptors.map((descriptor) => descriptor.toTileId)).toContain("3:5");
    expect(descriptors.map((descriptor) => descriptor.toTileId)).toContain("4:4");
  });

  it("returns empty when no actions", () => {
    const unit = makeUnitWithActions("Unit-1", tile_3_4, [], {});

    expect(describeUnitActions(unit as never)).toEqual([]);
  });

  it("passes current tile to actionsForNeighbours", () => {
    let capturedFrom: unknown;
    const fortify = makeActionStub("Fortify", makeUnitStub("Unit-1"), tile_3_4, tile_3_4);

    const unit = {
      id: () => "Unit-1",
      tile: () => tile_3_4,
      actions: () => [fortify],
      actionsForNeighbours: (from: unknown) => {
        capturedFrom = from;
        return {};
      },
    };

    describeUnitActions(unit as never);

    expect(capturedFrom).toBe(tile_3_4);
  });
});

