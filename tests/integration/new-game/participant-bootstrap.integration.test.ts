import { describe, expect, it } from 'vitest';
import { createBackendRuntime } from '../../../src/js/backend';

describe('participant bootstrap integration', () => {
  it('registers participants, players, and clients before first turn work', async () => {
    const backend = createBackendRuntime({
      createSessionId: () => 'session-participants',
      now: () => 10,
    });

    const result = await backend.startGame({
      requestId: 'req-1',
      requestedAt: 10,
      source: 'ui_button',
    });

    expect(result.status).toBe('started');
    expect(backend.orchestrator.registries.participants).toHaveLength(3);
    expect(backend.orchestrator.registries.players).toHaveLength(3);
    expect(backend.orchestrator.registries.clients).toHaveLength(3);
  });
});

