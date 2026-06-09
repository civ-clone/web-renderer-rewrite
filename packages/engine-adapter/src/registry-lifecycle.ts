export interface ResettableRegistry {
  readonly name?: string;
  reset(): void;
}

/**
 * Lightweight lifecycle coordinator for singleton registries.
 *
 * This does not modify upstream registry implementations; it provides a
 * deterministic orchestration point for test isolation and per-match cleanup.
 */
export class RegistryLifecycle {
  #registries = new Set<ResettableRegistry>();

  register(...registries: ResettableRegistry[]): void {
    for (const registry of registries) {
      this.#registries.add(registry);
    }
  }

  unregister(...registries: ResettableRegistry[]): void {
    for (const registry of registries) {
      this.#registries.delete(registry);
    }
  }

  size(): number {
    return this.#registries.size;
  }

  resetAll(): void {
    for (const registry of this.#registries) {
      registry.reset();
    }
  }
}

export function resetRegistries(...registries: ResettableRegistry[]): void {
  for (const registry of registries) {
    registry.reset();
  }
}

