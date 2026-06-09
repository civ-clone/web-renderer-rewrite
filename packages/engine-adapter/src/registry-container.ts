import { AsyncLocalStorage } from "node:async_hooks";

type ResettableLike = {
  reset?: () => void;
};

export class RegistryContainer {
  #registries = new Map<string, unknown>();

  constructor(initial?: Record<string, unknown>) {
    if (!initial) {
      return;
    }

    for (const [name, registry] of Object.entries(initial)) {
      this.#registries.set(name, registry);
    }
  }

  set(name: string, registry: unknown): void {
    this.#registries.set(name, registry);
  }

  get<T = unknown>(name: string): T | undefined {
    return this.#registries.get(name) as T | undefined;
  }

  require<T = unknown>(name: string): T {
    const registry = this.get<T>(name);
    if (registry === undefined) {
      throw new Error(`RegistryContainer: registry '${name}' not found.`);
    }
    return registry;
  }

  has(name: string): boolean {
    return this.#registries.has(name);
  }

  remove(name: string): boolean {
    return this.#registries.delete(name);
  }

  size(): number {
    return this.#registries.size;
  }

  keys(): string[] {
    return Array.from(this.#registries.keys());
  }

  clear(): void {
    this.#registries.clear();
  }

  resetAllResettable(): void {
    for (const registry of this.#registries.values()) {
      const maybeResettable = registry as ResettableLike;
      if (typeof maybeResettable.reset === "function") {
        maybeResettable.reset();
      }
    }
  }
}

const storage = new AsyncLocalStorage<RegistryContainer>();

export function withRegistryContainer<T>(
  container: RegistryContainer,
  fn: () => T
): T {
  return storage.run(container, fn);
}

export function getRegistryContainer(): RegistryContainer | undefined {
  return storage.getStore();
}

export function requireRegistryContainer(): RegistryContainer {
  const container = getRegistryContainer();
  if (!container) {
    throw new Error("RegistryContainer: no active container in current async context.");
  }
  return container;
}

