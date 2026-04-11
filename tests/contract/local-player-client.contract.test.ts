import { describe, expect, it } from 'vitest';
import {
  BackendRelayClient,
  LocalPlayer,
} from '../../src/client/local-player';
import {
  baseMandatoryActions,
  createBackendStub,
  createIntent,
  fixedPlayerId,
} from '../helpers/localPlayerFixtures';

describe('LocalPlayer contract', () => {
  it('returns complete mandatory actions via getMandatoryActions()', async () => {
    const relay = new BackendRelayClient(createBackendStub());
    const localPlayer = new LocalPlayer(relay, fixedPlayerId, {
      supportedIntentTypes: ['move-unit', 'set-research'],
    });

    const actions = await localPlayer.getMandatoryActions();

    expect(actions).toHaveLength(baseMandatoryActions.length);
    expect(actions.map((a) => a.actionId)).toEqual(
      baseMandatoryActions.map((a) => a.id)
    );
  });

  it('returns success outcome shape for submitIntent()', async () => {
    const relay = new BackendRelayClient(createBackendStub());
    const localPlayer = new LocalPlayer(relay, fixedPlayerId, {
      supportedIntentTypes: ['move-unit', 'set-research'],
    });

    const outcome = await localPlayer.submitIntent(createIntent());

    expect(outcome.status).toBe('success');
    expect(outcome.message.length).toBeGreaterThan(0);
    expect(outcome.requestId.length).toBeGreaterThan(0);
    expect(outcome.updatedMandatoryActions.length).toBe(baseMandatoryActions.length);
    expect(outcome.recoverable).toBe(false);
  });
});

