import { createHash } from "node:crypto";

export interface SeededRng {
  algorithm: "xorshift64*";
  seed: string;
  next(): number;
  nextInt(max: number): number;
  counter(): number;
}

function seedToState(seed: string): bigint {
  const hex = createHash("sha256").update(seed, "utf8").digest("hex").slice(0, 16);
  const state = BigInt(`0x${hex}`);
  return state === 0n ? 0x9e3779b97f4a7c15n : state;
}

/**
 * Derive a deterministic hex seed from stable match context parts.
 */
export function deriveDeterministicSeed(...parts: Array<string | number>): string {
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex");
}

/**
 * Deterministic xorshift64* RNG returning values in [0, 1).
 */
export function createDeterministicRng(seed: string): SeededRng {
  let state = seedToState(seed);
  let draws = 0;

  const nextUint64 = (): bigint => {
    state ^= state >> 12n;
    state ^= state << 25n;
    state ^= state >> 27n;
    state *= 2685821657736338717n;
    state &= 0xffffffffffffffffn;
    draws += 1;
    return state;
  };

  return {
    algorithm: "xorshift64*",
    seed,
    next(): number {
      const value = Number(nextUint64() >> 11n);
      return value / 9007199254740992;
    },
    nextInt(max: number): number {
      if (!Number.isInteger(max) || max <= 0) {
        throw new RangeError("nextInt(max): max must be a positive integer.");
      }
      return Math.floor(this.next() * max);
    },
    counter(): number {
      return draws;
    },
  };
}

