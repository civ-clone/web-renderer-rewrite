import { describe, expect, it } from 'vitest';
import { createBackendRuntime } from '../../../src/js/backend';
import { createFrontendRuntime } from '../../../src/js/frontend';

describe('startup failure integration', () => {
  it('surfaces recoverable startup errors to the frontend', async () => {
    const backend = createBackendRuntime({
      now: () => 1,
      createSessionId: () => 'session-fail',
      initializationProfile: {
        modules: ['required-module'],
      },
      initializationModules: [],
    });

    const frontend = createFrontendRuntime({
      startGame: backend.startGame,
      now: () => 1,
    });

    const result = await frontend.clickStart();

    expect(result?.status).toBe('failed');
    expect(frontend.getState().session.status).toBe('failed');
    expect(frontend.getState().startupFailureMessage).toContain('Startup failed');
  });
});

