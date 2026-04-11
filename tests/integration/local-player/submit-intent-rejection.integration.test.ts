import { describe, expect, it } from 'vitest';
import {
  BackendRelayClient,
  LocalPlayer,
} from '../../../src/client/local-player';
import { showCommandOutcomeError } from '../../../src/ui/mandatory-actions/showCommandOutcomeError';
import {
  createBackendStub,
  createIntent,
  fixedPlayerId,
} from '../../helpers/localPlayerFixtures';

describe('submitIntent rejection integration', () => {
  it('normalizes backend rejection and keeps refreshed actions', async () => {
    const relay = new BackendRelayClient(createBackendStub({ rejectSubmission: true }));
    const localPlayer = new LocalPlayer(relay, fixedPlayerId, {
      supportedIntentTypes: ['move-unit', 'set-research'],
    });

    const outcome = await localPlayer.submitIntent(createIntent());

    expect(outcome.status).toBe('rejected');
    expect(outcome.recoverable).toBe(true);
    expect(outcome.updatedMandatoryActions.length).toBeGreaterThan(0);
    expect(showCommandOutcomeError(outcome)).toContain('rejected');
  });
});

