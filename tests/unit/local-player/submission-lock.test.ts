import { describe, expect, it } from 'vitest';
import {
  BackendRelayClient,
  LocalPlayer,
} from '../../../src/client/local-player';
import {
  SubmissionLockManager,
  dedupeKeyFrom,
} from '../../../src/client/local-player/submissionLock';
import {
  createBackendStub,
  createIntent,
  fixedPlayerId,
  fixedTurnToken,
} from '../../helpers/localPlayerFixtures';

describe('SubmissionLockManager', () => {
  it('rejects duplicate in-flight lock acquisitions', () => {
    const lockManager = new SubmissionLockManager();
    const key = dedupeKeyFrom('action-1', fixedTurnToken, fixedPlayerId);

    lockManager.acquire(key, 'request-1');

    expect(() => lockManager.acquire(key, 'request-2')).toThrowError(
      /Duplicate submission/
    );
  });

  it('rejects duplicate submitIntent while previous request is in-flight', async () => {
    let releaseSubmit: () => void = () => undefined;
    const submitBlocked = new Promise<void>((resolve) => {
      releaseSubmit = resolve;
    });

    const backend = createBackendStub();
    const relay = new BackendRelayClient({
      ...backend,
      async submitCommand(request) {
        await submitBlocked;

        return backend.submitCommand(request);
      },
    });

    const localPlayer = new LocalPlayer(relay, fixedPlayerId, {
      supportedIntentTypes: ['move-unit', 'set-research'],
    });

    const firstPromise = localPlayer.submitIntent(createIntent());
    const duplicateOutcomePromise = localPlayer.submitIntent(createIntent());

    const duplicateOutcome = await duplicateOutcomePromise;
    releaseSubmit();
    await firstPromise;

    expect(duplicateOutcome.status).toBe('rejected');
    expect(duplicateOutcome.message).toContain('Duplicate submission');
  });
});

