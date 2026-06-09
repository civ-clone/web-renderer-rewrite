export interface ObservabilityEvent {
  type: string;
  at: number;
  matchId?: string;
  payload: Record<string, unknown>;
}

export interface ObservabilitySink {
  record(event: ObservabilityEvent): void;
}

export class NoopObservabilitySink implements ObservabilitySink {
  record(_event: ObservabilityEvent): void {
    // Intentionally empty.
  }
}

export class InMemoryObservabilitySink implements ObservabilitySink {
  #events: ObservabilityEvent[] = [];

  record(event: ObservabilityEvent): void {
    this.#events.push(event);
  }

  events(): ObservabilityEvent[] {
    return [...this.#events];
  }

  clear(): void {
    this.#events.length = 0;
  }
}

export function createObservabilityEvent(
  type: string,
  payload: Record<string, unknown>,
  matchId?: string
): ObservabilityEvent {
  return {
    type,
    at: Date.now(),
    ...(matchId ? { matchId } : {}),
    payload,
  };
}

