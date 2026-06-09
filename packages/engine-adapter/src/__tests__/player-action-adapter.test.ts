/**
 * Tests for player action adapter (WP-002).
 *
 * Strategy:
 * - Use local stub classes instead of engine package imports.
 * - Verify mandatory detection via prototype-chain naming.
 * - Verify value ID and stable ID projection behavior.
 */

import { describe, it, expect } from "vitest";
import { describePlayerAction, describePlayerActions } from "../player-action-adapter.js";

// ---------------------------------------------------------------------------
// Stub engine classes used across tests
// ---------------------------------------------------------------------------

class MandatoryPlayerAction {}

class OptionalAction {
  readonly #value: unknown;

  constructor(value: unknown) {
    this.#value = value;
  }

  value(): unknown {
    return this.#value;
  }
}

class MandatoryAction extends MandatoryPlayerAction {
  readonly #value: unknown;

  constructor(value: unknown) {
    super();
    this.#value = value;
  }

  value(): unknown {
    return this.#value;
  }
}

class ValueRef {
  readonly #id: string;

  constructor(id: string) {
    this.#id = id;
  }

  id(): string {
    return this.#id;
  }
}

class StableValueRef extends ValueRef {
  readonly #stableId: string;

  constructor(id: string, stableId: string) {
    super(id);
    this.#stableId = stableId;
  }

  getStableId(): string {
    return this.#stableId;
  }
}

// ---------------------------------------------------------------------------
// describePlayerAction — mandatory action
// ---------------------------------------------------------------------------

describe("describePlayerAction", () => {
  it("sets tier to player", () => {
    const descriptor = describePlayerAction(new OptionalAction(null) as never);

    expect(descriptor.tier).toBe("player");
  });

  it("uses constructor name as actionType", () => {
    const descriptor = describePlayerAction(new OptionalAction(null) as never);

    expect(descriptor.actionType).toBe("OptionalAction");
  });

  it("marks mandatory false for non-mandatory actions", () => {
    const descriptor = describePlayerAction(new OptionalAction(null) as never);

    expect(descriptor.mandatory).toBe(false);
  });

  it("marks mandatory true when MandatoryPlayerAction is in prototype chain", () => {
    const descriptor = describePlayerAction(new MandatoryAction(null) as never);

    expect(descriptor.mandatory).toBe(true);
  });

  it("projects valueType and valueId when value exposes id()", () => {
    const value = new ValueRef("PlayerResearch-1");
    const descriptor = describePlayerAction(new OptionalAction(value) as never);

    expect(descriptor.valueType).toBe("ValueRef");
    expect(descriptor.valueId).toBe("PlayerResearch-1");
  });

  it("projects valueStableId when value exposes getStableId()", () => {
    const value = new StableValueRef("Unit-1", "unit:42:3");
    const descriptor = describePlayerAction(new OptionalAction(value) as never);

    expect(descriptor.valueId).toBe("Unit-1");
    expect(descriptor.valueStableId).toBe("unit:42:3");
  });

  it("omits value fields for null values", () => {
    const descriptor = describePlayerAction(new OptionalAction(null) as never);

    expect(descriptor.valueType).toBeUndefined();
    expect(descriptor.valueId).toBeUndefined();
    expect(descriptor.valueStableId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// describePlayerActions — collection adapter
// ---------------------------------------------------------------------------

describe("describePlayerActions", () => {
  it("maps all actions in order", () => {
    const player = {
      actions: () => [
        new MandatoryAction(new ValueRef("A-1")),
        new OptionalAction(new StableValueRef("B-1", "stable-b")),
      ],
    };

    const descriptors = describePlayerActions(player as never);

    expect(descriptors).toHaveLength(2);
    expect(descriptors[0].actionType).toBe("MandatoryAction");
    expect(descriptors[0].mandatory).toBe(true);
    expect(descriptors[1].actionType).toBe("OptionalAction");
    expect(descriptors[1].mandatory).toBe(false);
    expect(descriptors[1].valueStableId).toBe("stable-b");
  });

  it("returns empty array when player has no actions", () => {
    const player = { actions: () => [] };

    expect(describePlayerActions(player as never)).toEqual([]);
  });
});
