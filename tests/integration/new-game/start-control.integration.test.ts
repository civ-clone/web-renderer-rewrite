import { describe, expect, it } from 'vitest';
import { createBackendRuntime } from '../../../src/js/backend';
import { createFrontendRuntime } from '../../../src/js/frontend';

describe('new-game start control integration', () => {
  it('stays idle on load and starts only on explicit click', async () => {
    const backend = createBackendRuntime({
      createSessionId: () => 'session-integration',
      now: () => 100,
    });
    const frontend = createFrontendRuntime({
      startGame: backend.startGame,
      now: () => 100,
    });

    expect(frontend.getState().session.status).toBe('idle');
    expect(frontend.getState().mandatoryActionsVisible).toBe(false);

    const result = await frontend.clickStart();

    expect(result?.status).toBe('started');
    expect(frontend.getState().session.status).toBe('active');
  });
});

