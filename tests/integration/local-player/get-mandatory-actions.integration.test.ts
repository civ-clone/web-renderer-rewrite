import { describe, expect, it } from 'vitest';
import {
  BackendRelayClient,
  LocalPlayer,
} from '../../../src/client/local-player';
import { renderMandatoryActions } from '../../../src/ui/mandatory-actions/renderMandatoryActions';
import {
  baseMandatoryActions,
  createBackendStub,
  fixedPlayerId,
} from '../../helpers/localPlayerFixtures';

describe('getMandatoryActions integration', () => {
  it('renders all mandatory actions for the active player', async () => {
    const relay = new BackendRelayClient(createBackendStub());
    const localPlayer = new LocalPlayer(relay, fixedPlayerId, {
      supportedIntentTypes: ['move-unit', 'set-research'],
    });

    const rendered = renderMandatoryActions(await localPlayer.getMandatoryActions());

    expect(rendered).toHaveLength(baseMandatoryActions.length);
    expect(rendered[0]).toContain(baseMandatoryActions[0].label);
    expect(rendered[1]).toContain(baseMandatoryActions[1].label);
  });
});

