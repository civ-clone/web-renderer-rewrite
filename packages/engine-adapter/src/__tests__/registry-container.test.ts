import { describe, expect, it } from "vitest";
import {
  RegistryContainer,
  getRegistryContainer,
  requireRegistryContainer,
  withRegistryContainer,
} from "../registry-container.js";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("RegistryContainer", () => {
  it("stores and retrieves registries by name", () => {
    const container = new RegistryContainer();
    container.set("units", { name: "units-registry" });

    expect(container.has("units")).toBe(true);
    expect(container.get<{ name: string }>("units")?.name).toBe("units-registry");
    expect(container.keys()).toEqual(["units"]);
    expect(container.size()).toBe(1);
  });

  it("require throws for missing registries", () => {
    const container = new RegistryContainer();
    expect(() => container.require("missing")).toThrow();
  });

  it("resets resettable registries only", () => {
    const calls: string[] = [];
    const container = new RegistryContainer({
      a: { reset: () => calls.push("a") },
      b: { reset: () => calls.push("b") },
      c: { notReset: true },
    });

    container.resetAllResettable();

    expect(calls).toEqual(["a", "b"]);
  });
});

describe("RegistryContainer async context", () => {
  it("binds container to current async flow", async () => {
    const container = new RegistryContainer({ matchId: "match:1" });

    await withRegistryContainer(container, async () => {
      await wait(1);
      const current = requireRegistryContainer();
      expect(current.get("matchId")).toBe("match:1");
    });

    expect(getRegistryContainer()).toBeUndefined();
  });

  it("supports nested containers and restores outer context", async () => {
    const outer = new RegistryContainer({ name: "outer" });
    const inner = new RegistryContainer({ name: "inner" });

    await withRegistryContainer(outer, async () => {
      expect(requireRegistryContainer().get("name")).toBe("outer");

      await withRegistryContainer(inner, async () => {
        expect(requireRegistryContainer().get("name")).toBe("inner");
      });

      expect(requireRegistryContainer().get("name")).toBe("outer");
    });
  });

  it("isolates parallel contexts", async () => {
    const results = await Promise.all([
      withRegistryContainer(new RegistryContainer({ id: "A" }), async () => {
        await wait(2);
        return requireRegistryContainer().get("id");
      }),
      withRegistryContainer(new RegistryContainer({ id: "B" }), async () => {
        await wait(1);
        return requireRegistryContainer().get("id");
      }),
    ]);

    expect(results.sort()).toEqual(["A", "B"]);
  });

  it("requireRegistryContainer throws when no context is active", () => {
    expect(() => requireRegistryContainer()).toThrow();
  });
});

