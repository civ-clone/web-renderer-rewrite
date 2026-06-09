import {
  RegistryContainer,
  requireRegistryContainer,
  withRegistryContainer,
} from "../registry-container.js";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMatch(matchId: string, delayMs: number): Promise<string> {
  return withRegistryContainer(
    new RegistryContainer({
      matchId,
      unitsRegistry: { reset: () => undefined },
      citiesRegistry: { reset: () => undefined },
    }),
    async () => {
      await wait(delayMs);
      const container = requireRegistryContainer();
      const currentMatchId = container.require<string>("matchId");
      container.resetAllResettable();
      return currentMatchId;
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

