import { describe, expect, it } from 'vitest';
import {
  BackendRelayClient,
  LocalPlayer,
  measureLatency,
} from '../../../src/client/local-player';
import { submitMandatoryAction } from '../../../src/ui/mandatory-actions/submitMandatoryAction';
import {
  createBackendStub,
  createIntent,
  fixedPlayerId,
} from '../../helpers/localPlayerFixtures';

describe('submitIntent success integration', () => {
  it('relays command and returns refreshed actions', async () => {
    const backend = createBackendStub();
    const relay = new BackendRelayClient(backend);
    const localPlayer = new LocalPlayer(relay, fixedPlayerId, {
      supportedIntentTypes: ['move-unit', 'set-research'],
    });

    const { result: outcome, measurement } = await measureLatency(() =>
      submitMandatoryAction(localPlayer, createIntent())
    );

    expect(backend.submissions).toHaveLength(1);
    expect(outcome.status).toBe('success');
    expect(outcome.updatedMandatoryActions.length).toBeGreaterThan(0);
    expect(measurement.durationMs).toBeLessThanOrEqual(2000);
  });
});

