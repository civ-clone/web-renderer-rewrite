import { describe, expect, it } from 'vitest';
import { createStartNewGameOrchestrator } from '../../../src/js/new-game/startNewGame';

describe('start idempotence', () => {
  it('returns already_started for duplicate requests once active', async () => {
	const orchestrator = createStartNewGameOrchestrator({
	  createSessionId: () => 'session-fixed',
	  now: () => 1,
	});

	const first = await orchestrator.startNewGame({
	  requestId: 'req-1',
	  requestedAt: 1,
	  source: 'ui_button',
	});
	const second = await orchestrator.startNewGame({
	  requestId: 'req-2',
	  requestedAt: 2,
	  source: 'ui_button',
	});

	expect(first.status).toBe('started');
	expect(second.status).toBe('already_started');
	expect(orchestrator.registries.participants).toHaveLength(3);
  });
});

