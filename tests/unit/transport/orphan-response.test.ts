import { describe, expect, it, vi } from 'vitest';
import Civilization from '@civ-clone/core-civilization/Civilization';
import Leader from '@civ-clone/core-civilization/Leader';
import LeaderRegistry from '@civ-clone/core-civilization/LeaderRegistry';
import Player from '@civ-clone/core-player/Player';
import { ChoiceMeta } from '@civ-clone/core-client/ChoiceMeta';
import { LocalPlayer } from '../../../src/client/local-player/LocalPlayer';
import { InProcessTransport } from '../../helpers/transportFixtures';

class TestCivilization extends Civilization {}

class TestLeader extends Leader {
  static civilization(): typeof Civilization {
    return TestCivilization;
  }
}

const leaderRegistry = new LeaderRegistry();
leaderRegistry.register(TestLeader);

describe('Orphan response handling', () => {
  it('a TransportResponse with an unknown correlationId is silently discarded without error', () => {
    const transport = new InProcessTransport();
    const player = new Player();
    // LocalPlayer is created but no request is in flight
    new LocalPlayer(player, leaderRegistry, transport, { timeoutMs: 5000 });

    expect(() => {
      transport.respond({ correlationId: 'non-existent-id', payload: 42 });
    }).not.toThrow();
  });

  it('an orphan response does not resolve any other pending request', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const meta = new ChoiceMeta([TestCivilization], 'choose-civilization');
    const realPromise = localPlayer.chooseFromList(meta);

    const realCorrId = transport.sentRequests[0].correlationId;

    // Deliver a response for a completely different ID
    transport.respond({ correlationId: 'ghost-id-xyz', payload: 0 });

    // The real promise must still be pending (not resolved by the ghost response)
    const settled = await Promise.race([
      realPromise.then(() => 'resolved'),
      Promise.resolve('pending'),
    ]);
    expect(settled).toBe('pending');

    // Now properly resolve the real request
    transport.respondTo(realCorrId, 0);
    await expect(realPromise).resolves.toBe(TestCivilization);
  });

  it('multiple orphan responses do not cause any side-effect', () => {
    const transport = new InProcessTransport();
    const player = new Player();
    new LocalPlayer(player, leaderRegistry, transport, { timeoutMs: 5000 });

    expect(() => {
      for (let i = 0; i < 20; i++) {
        transport.respond({ correlationId: `ghost-${i}`, payload: i });
      }
    }).not.toThrow();
  });

  it('an orphan response after a request timed out does not throw', async () => {
    vi.useFakeTimers();
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 50,
    });

    const meta = new ChoiceMeta([TestCivilization], 'choose-civilization');
    const promise = localPlayer.chooseFromList(meta);
    const correlationId = transport.sentRequests[0].correlationId;

    vi.advanceTimersByTime(100);
    await promise.catch(() => {});

    // The pending entry has been cleared; this response is now orphaned
    expect(() =>
      transport.respond({ correlationId, payload: 0 })
    ).not.toThrow();

    vi.useRealTimers();
  });
});

