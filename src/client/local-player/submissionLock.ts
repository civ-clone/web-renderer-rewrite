export interface SubmissionLock {
  dedupeKey: string;
  requestId: string;
  createdAt: number;
  state: 'in_flight' | 'released';
}

export const dedupeKeyFrom = (
  actionId: string,
  turnToken: string,
  playerId: string
): string => `${playerId}:${actionId}:${turnToken}`;

export class SubmissionLockManager {
  private readonly inFlight = new Map<string, SubmissionLock>();

  acquire(
    dedupeKey: string,
    requestId: string,
    createdAt = Date.now()
  ): SubmissionLock {
    const existingLock = this.inFlight.get(dedupeKey);

    if (existingLock?.state === 'in_flight') {
      throw new Error(`Duplicate submission in flight for ${dedupeKey}`);
    }

    const lock: SubmissionLock = {
      dedupeKey,
      requestId,
      createdAt,
      state: 'in_flight',
    };

    this.inFlight.set(dedupeKey, lock);

    return lock;
  }

  release(dedupeKey: string): void {
    const lock = this.inFlight.get(dedupeKey);

    if (!lock) {
      return;
    }

    lock.state = 'released';
    this.inFlight.delete(dedupeKey);
  }

  hasInFlight(dedupeKey: string): boolean {
    return this.inFlight.get(dedupeKey)?.state === 'in_flight';
  }
}
