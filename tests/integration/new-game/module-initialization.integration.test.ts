import { describe, expect, it } from 'vitest';
import { createBackendRuntime } from '../../../src/js/backend';

describe('module initialization integration', () => {
  it('initializes required modules before active session', async () => {
    const order: string[] = [];
    const backend = createBackendRuntime({
      now: () => 1,
      createSessionId: () => 'session-init',
      initializationProfile: {
        modules: ['m1', 'm2'],
      },
      initializationModules: [
        {
          name: 'm1',
          initialize: () => order.push('m1'),
        },
        {
          name: 'm2',
          initialize: () => order.push('m2'),
        },
      ],
    });

    const result = await backend.startGame({
      requestId: 'req-1',
      requestedAt: 1,
      source: 'ui_button',
    });

    expect(result.status).toBe('started');
    expect(order).toEqual(['m1', 'm2']);
  });
});

