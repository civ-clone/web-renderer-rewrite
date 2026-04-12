import { describe, expect, it } from 'vitest';
import { createBackendRuntime } from '../../../src/js/backend';
import { createFrontendRuntime } from '../../../src/js/frontend';

describe('MVP walkthrough integration', () => {
  it('loads idle, starts once, and then shows mandatory-action rendering pathway', async () => {
    const backend = createBackendRuntime({
      createSessionId: () => 'session-mvp',
      now: () => 1,
    });
    const frontend = createFrontendRuntime({
      startGame: backend.startGame,
      now: () => 1,
    });

    expect(frontend.getState().session.status).toBe('idle');

    await frontend.clickStart();
    const rendered = frontend.onMandatoryActions([
      {
        actionId: 'action-1',
        label: 'End Turn',
        turnToken: 'turn-1',
        metadata: {},
      },
    ]);

    expect(frontend.getState().session.status).toBe('active');
    expect(frontend.getState().mandatoryActionsVisible).toBe(true);
    expect(rendered[0]).toContain('End Turn');
  });
});

