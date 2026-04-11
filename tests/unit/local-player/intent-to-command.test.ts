import { describe, expect, it } from 'vitest';
import {
  deterministicRequestId,
  intentToCommand,
} from '../../../src/client/local-player/intentToCommand';
import { createIntent, fixedPlayerId } from '../../helpers/localPlayerFixtures';

describe('intentToCommand', () => {
  it('maps the same intent deterministically', () => {
    const intent = createIntent();

    const first = intentToCommand(intent, fixedPlayerId);
    const second = intentToCommand(intent, fixedPlayerId);

    expect(first).toEqual(second);
    expect(deterministicRequestId(intent, fixedPlayerId)).toBe(first.requestId);
  });
});

