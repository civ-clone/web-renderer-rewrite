import { describe, expect, it } from 'vitest';
import { bootstrapParticipants } from '../../../src/js/new-game/bootstrapParticipants';

describe('participant summary contract', () => {
  it('enforces fixed participant summary invariants', () => {
    const { participants, summary } = bootstrapParticipants('session-abc');

    expect(participants).toHaveLength(3);
    expect(summary.totalParticipants).toBe(3);
    expect(summary.localParticipants).toBe(1);
    expect(summary.aiParticipants).toBe(2);
    expect(summary.allRegistered).toBe(true);
  });
});

