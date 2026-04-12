import { describe, expect, it } from 'vitest';
import LeaderRegistry from '@civ-clone/core-civilization/LeaderRegistry';
import MandatoryPlayerAction from '@civ-clone/core-player/MandatoryPlayerAction';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import { LocalPlayer } from '../../../src/client/local-player/LocalPlayer';
import { InProcessTransport } from '../../helpers/transportFixtures';

// ---------------------------------------------------------------------------
// StubPlayer — a Player subclass with fully-controlled mandatory actions so
// the integration tests do not need a live game-rules registry.
// ---------------------------------------------------------------------------

class StubPlayer extends Player {
  private _mandatory: MandatoryPlayerAction[] = [];

  constructor() {
    // Fresh RuleRegistry avoids touching the shared singleton
    super(new RuleRegistry());
  }

  override hasMandatoryActions(): boolean {
    return this._mandatory.length > 0;
  }

  override mandatoryActions(): MandatoryPlayerAction[] {
    return [...this._mandatory];
  }

  addMandatoryAction(value: unknown): MandatoryPlayerAction {
    const action = new MandatoryPlayerAction(this, value);
    this._mandatory.push(action);
    return action;
  }

  addExecutableMandatoryAction(execute: () => void): MandatoryPlayerAction {
    return this.addMandatoryAction({ execute });
  }

  clearMandatoryActions(): void {
    this._mandatory = [];
  }
}

const leaderRegistry = new LeaderRegistry();

describe('takeTurn() round-trip integration', () => {
  it('dispatches mandatory actions through the transport and resolves when the matching response arrives', async () => {
    const transport = new InProcessTransport();
    const player = new StubPlayer();
    player.addExecutableMandatoryAction(() => player.clearMandatoryActions());

    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    // Start the turn (will block until the transport responds)
    const turnPromise = localPlayer.takeTurn();

    // A request must have been dispatched
    expect(transport.sentRequests.length).toBe(1);

    const request = transport.sentRequests[0];
    expect(request.type).toBe('mandatory-action');
    expect(typeof request.correlationId).toBe('string');
    expect(request.correlationId.length).toBeGreaterThan(0);

    // Verify payload contains the serialised mandatory-action list
    const actions = request.payload['actions'];
    expect(Array.isArray(actions)).toBe(true);
    expect((actions as unknown[]).length).toBe(1);

    // Simulate the frontend resolving the selected mandatory action.
    transport.respondToLast({ actionIndex: 0 });

    // takeTurn() must complete without error
    await expect(turnPromise).resolves.toBeUndefined();
  });

  it('loops until all mandatory actions have been handled', async () => {
    const transport = new InProcessTransport();
    const player = new StubPlayer();
    player.addExecutableMandatoryAction(() => {
      player.clearMandatoryActions();
      player.addExecutableMandatoryAction(() => player.clearMandatoryActions());
    });

    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const turnPromise = localPlayer.takeTurn();

    // First request dispatched
    expect(transport.sentRequests.length).toBe(1);

    // Resolve the first action; executing it schedules another mandatory action.
    transport.respondToLast({ actionIndex: 0 });

    // Second request dispatched
    await new Promise((r) => setTimeout(r, 0));
    expect(transport.sentRequests.length).toBe(2);

    // Resolve the second action; executing it clears the queue.
    transport.respondToLast({ actionIndex: 0 });

    await expect(turnPromise).resolves.toBeUndefined();
  });

  it('resolves immediately when there are no mandatory actions', async () => {
    const transport = new InProcessTransport();
    const player = new StubPlayer(); // no mandatory actions

    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    await expect(localPlayer.takeTurn()).resolves.toBeUndefined();
    expect(transport.sentRequests.length).toBe(0);
  });
});

