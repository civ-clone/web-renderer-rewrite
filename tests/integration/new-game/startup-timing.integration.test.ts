import { describe, expect, it } from 'vitest';
import { createBackendRuntime } from '../../../src/js/backend';
import { createFrontendRuntime } from '../../../src/js/frontend';
import { elapsedMs, expectUnderThreshold } from '../../helpers/startupTiming';

describe('startup timing integration', () => {
  it('meets action-visibility and failure-surface thresholds', async () => {
    let tick = 0;
    const now = (): number => {
      tick += 500;
      return tick;
    };

    const backend = createBackendRuntime({ now, createSessionId: () => 'session-timing' });
    const frontend = createFrontendRuntime({ startGame: backend.startGame, now });

    const start = now();
    await frontend.clickStart();
    const completed = now();

    const firstActionElapsed = elapsedMs(start, completed);
    expect(expectUnderThreshold(firstActionElapsed, 5000)).toBe(true);

    const failingBackend = createBackendRuntime({
      now,
      createSessionId: () => 'session-failing-timing',
      initializationProfile: {
        modules: ['missing'],
      },
      initializationModules: [],
    });
    const failingFrontend = createFrontendRuntime({
      startGame: failingBackend.startGame,
      now,
    });

    const failingStart = now();
    await failingFrontend.clickStart();
    const failingEnd = now();

    const failureElapsed = elapsedMs(failingStart, failingEnd);
    expect(expectUnderThreshold(failureElapsed, 3000)).toBe(true);
  });
});
