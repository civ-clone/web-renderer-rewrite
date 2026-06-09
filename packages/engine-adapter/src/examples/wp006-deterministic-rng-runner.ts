import {
  createDeterministicRng,
  deriveDeterministicSeed,
} from "../deterministic-rng.js";

const seed = deriveDeterministicSeed("match:abc", 42, "player:1");

const a = createDeterministicRng(seed);
const b = createDeterministicRng(seed);

const draws = 6;
const seqA: number[] = [];
const seqB: number[] = [];

for (let i = 0; i < draws; i += 1) {
  seqA.push(a.next());
  seqB.push(b.next());
}

const same = seqA.every((value, index) => value === seqB[index]);

console.log("WP-006 deterministic RNG demo");
console.log(`seed: ${seed}`);
console.log("sequence A:", seqA);
console.log("sequence B:", seqB);
console.log("same-seed same-sequence:", same);
console.log("draw counter:", a.counter());

