import { describe, expect, it } from 'vitest';
import {
  BackendRelayClient,
  LocalPlayer,
} from '../../../src/client/local-player';
import {
  createBackendStub,
  createIntent,
  fixedPlayerId,
  fixedTurnToken,
} from '../../helpers/localPlayerFixtures';

describe('submitIntent error integration', () => {
  it('returns interpretation_error for stale turn token', async () => {
    const relay = new BackendRelayClient(
      createBackendStub({ staleTurnToken: `${fixedTurnToken}-next` })
    );
    const localPlayer = new LocalPlayer(relay, fixedPlayerId, {
      supportedIntentTypes: ['move-unit', 'set-research'],
    });

    const outcome = await localPlayer.submitIntent(createIntent());

    expect(outcome.status).toBe('interpretation_error');
    expect(outcome.recoverable).toBe(true);
  });

  it('returns transport_error for backend failures and refreshes actions when possible', async () => {
    const relay = new BackendRelayClient(createBackendStub({ throwOnSubmit: true }));
    const localPlayer = new LocalPlayer(relay, fixedPlayerId, {
      supportedIntentTypes: ['move-unit', 'set-research'],
    });

    const outcome = await localPlayer.submitIntent(createIntent());

    expect(outcome.status).toBe('transport_error');
    expect(outcome.recoverable).toBe(true);
    expect(outcome.updatedMandatoryActions.length).toBeGreaterThan(0);
  });
});

