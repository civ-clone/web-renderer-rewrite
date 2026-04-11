import { describe, expect, it } from 'vitest';
import {
  BackendRelayClient,
  LocalPlayer,
} from '../../../src/client/local-player';
import { renderMandatoryActions } from '../../../src/ui/mandatory-actions/renderMandatoryActions';
import {
  createBackendStub,
  fixedPlayerId,
} from '../../helpers/localPlayerFixtures';

describe('mandatory action determinism', () => {
  it('returns stable render output for same backend state', async () => {
    const relay = new BackendRelayClient(createBackendStub());
    const localPlayer = new LocalPlayer(relay, fixedPlayerId, {
      supportedIntentTypes: ['move-unit', 'set-research'],
    });

    const first = renderMandatoryActions(await localPlayer.getMandatoryActions());
    const second = renderMandatoryActions(await localPlayer.getMandatoryActions());

    expect(second).toEqual(first);
  });
});

