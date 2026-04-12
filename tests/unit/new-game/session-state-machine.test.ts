import { describe, expect, it } from 'vitest';
import {
  canAcceptStartRequest,
  createIdleSessionState,
  transitionToActive,
  transitionToFailed,
  transitionToStarting,
} from '../../../src/js/new-game/sessionState';

describe('new-game session state machine', () => {
  it('transitions idle -> starting -> active', () => {
    const idle = createIdleSessionState();
    const starting = transitionToStarting('session-1');
    const active = transitionToActive('session-1');

    expect(idle.status).toBe('idle');
    expect(starting.status).toBe('starting');
    expect(active.status).toBe('active');
  });

  it('transitions to failed with recoverable retry gate', () => {
    const failed = transitionToFailed('session-1', {
      code: 'unknown',
      message: 'oops',
      recoverable: true,
      detectedAt: 0,
    });

    expect(failed.status).toBe('failed');
    expect(canAcceptStartRequest(failed)).toBe(true);
    expect(canAcceptStartRequest(transitionToStarting('session-2'))).toBe(false);
  });
});


