import { describe, it, expect } from "vitest";
import {
  createDeterministicRng,
  deriveDeterministicSeed,
} from "../deterministic-rng.js";

describe("deterministic-rng", () => {
  it("produces identical sequences for identical seed", () => {
    const seed = deriveDeterministicSeed("match:abc", 10, "player:1");
    const a = createDeterministicRng(seed);
    const b = createDeterministicRng(seed);

    const seqA = [a.next(), a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next(), b.next()];

    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seed", () => {
    const a = createDeterministicRng(deriveDeterministicSeed("match:abc", 1));
    const b = createDeterministicRng(deriveDeterministicSeed("match:abc", 2));

    expect([a.next(), a.next(), a.next()]).not.toEqual([
      b.next(),
      b.next(),
      b.next(),
    ]);
  });

  it("tracks draw counter and supports bounded nextInt", () => {
    const rng = createDeterministicRng("seed");

    expect(rng.counter()).toBe(0);
    const n1 = rng.nextInt(10);
    const n2 = rng.nextInt(10);

    expect(n1).toBeGreaterThanOrEqual(0);
    expect(n1).toBeLessThan(10);
    expect(n2).toBeGreaterThanOrEqual(0);
    expect(n2).toBeLessThan(10);
    expect(rng.counter()).toBe(2);
  });

  it("derives stable deterministic seed from identical parts", () => {
    const a = deriveDeterministicSeed("match:abc", 10, "player:1");
    const b = deriveDeterministicSeed("match:abc", 10, "player:1");

    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

