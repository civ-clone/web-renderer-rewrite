import { describe, expect, it } from "vitest";
import {
  cutoverMode,
  shouldShadowCompare,
  shouldUseMigratedPath,
} from "../migration-cutover.js";

describe("migration-cutover", () => {
  it("defaults to legacy mode", () => {
    expect(cutoverMode(undefined, "units")).toBe("legacy");
    expect(shouldUseMigratedPath(undefined, "units")).toBe(false);
    expect(shouldShadowCompare(undefined, "units")).toBe(false);
  });

  it("enables migrated mode", () => {
    const config = { units: "migrated" } as const;
    expect(cutoverMode(config, "units")).toBe("migrated");
    expect(shouldUseMigratedPath(config, "units")).toBe(true);
    expect(shouldShadowCompare(config, "units")).toBe(false);
  });

  it("enables shadow compare mode", () => {
    const config = { units: "shadow" } as const;
    expect(cutoverMode(config, "units")).toBe("shadow");
    expect(shouldUseMigratedPath(config, "units")).toBe(false);
    expect(shouldShadowCompare(config, "units")).toBe(true);
  });
});

