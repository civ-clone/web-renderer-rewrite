import { describe, expect, it } from 'vitest';
import {
  createAlreadyStartedResult,
  createFailedResult,
  createStartedResult,
  type StartGameRequest,
} from '../../../src/js/new-game/contracts';

describe('new-game start contract', () => {
  it('represents explicit start requests with required fields', () => {
    const request: StartGameRequest = {
      requestId: 'req-1',
      requestedAt: 1,
      source: 'ui_button',
    };

    expect(request.source).toBe('ui_button');
  });

  it('represents successful starts with fixed participant counts', () => {
    const result = createStartedResult('req-1', 'session-1', {
      totalParticipants: 3,
      localParticipants: 1,
      aiParticipants: 2,
      allRegistered: true,
    });

    expect(result.status).toBe('started');
    expect(result.participantSummary).toEqual({
      totalParticipants: 3,
      localParticipants: 1,
      aiParticipants: 2,
      allRegistered: true,
    });
  });

  it('represents already-started and failed outcomes', () => {
    expect(createAlreadyStartedResult('req-2').status).toBe('already_started');

    const failed = createFailedResult('req-3', {
      code: 'transport',
      message: 'transport unavailable',
      recoverable: true,
      detectedAt: 10,
    });

    expect(failed.status).toBe('failed');
    expect(failed.failure?.recoverable).toBe(true);
  });
});


