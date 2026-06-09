import { describe, it, expect } from "vitest";
import {
  RegistryLifecycle,
  resetRegistries,
  type ResettableRegistry,
} from "../registry-lifecycle.js";

function makeRegistry(name: string): ResettableRegistry & { calls: number } {
  return {
    name,
    calls: 0,
    reset() {
      this.calls += 1;
    },
  };
}

describe("RegistryLifecycle", () => {
  it("registers and resets all registries", () => {
    const a = makeRegistry("a");
    const b = makeRegistry("b");

    const lifecycle = new RegistryLifecycle();
    lifecycle.register(a, b);

    expect(lifecycle.size()).toBe(2);

    lifecycle.resetAll();

    expect(a.calls).toBe(1);
    expect(b.calls).toBe(1);
  });

  it("does not duplicate registry instances when registered multiple times", () => {
    const a = makeRegistry("a");

    const lifecycle = new RegistryLifecycle();
    lifecycle.register(a, a);

    expect(lifecycle.size()).toBe(1);

    lifecycle.resetAll();
    expect(a.calls).toBe(1);
  });

  it("unregisters specific registries", () => {
    const a = makeRegistry("a");
    const b = makeRegistry("b");

    const lifecycle = new RegistryLifecycle();
    lifecycle.register(a, b);
    lifecycle.unregister(a);

    lifecycle.resetAll();

    expect(a.calls).toBe(0);
    expect(b.calls).toBe(1);
  });
});

describe("resetRegistries", () => {
  it("resets all provided registries once", () => {
    const a = makeRegistry("a");
    const b = makeRegistry("b");

    resetRegistries(a, b);

    expect(a.calls).toBe(1);
    expect(b.calls).toBe(1);
  });
});

