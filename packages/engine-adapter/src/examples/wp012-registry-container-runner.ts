import {
  RegistryContainer,
  requireRegistryContainer,
  withRegistryContainer,
} from "../registry-container.js";
import { withMatchScope, requireMatchId } from "../match-scope.js";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMatch(matchId: string, delayMs: number): Promise<string> {
  return withMatchScope(
    {
      matchId,
      registries: {
        unitsRegistry: { reset: () => undefined },
        citiesRegistry: { reset: () => undefined },
      },
    },
    async () => {
      await wait(delayMs);
      return requireMatchId();
    }
  );
}

async function main(): Promise<void> {
  console.log("WP-012 registry container demo");

  const [a, b] = await Promise.all([
    runMatch("match:A", 3),
    runMatch("match:B", 1),
  ]);

  console.log("isolated contexts:", [a, b]);
  console.log("(registries auto-reset on scope exit)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

