import { describe, expect, it } from 'vitest';
import Civilization from '@civ-clone/core-civilization/Civilization';
import Leader from '@civ-clone/core-civilization/Leader';
import LeaderRegistry from '@civ-clone/core-civilization/LeaderRegistry';
import Player from '@civ-clone/core-player/Player';
import { ChoiceMeta } from '@civ-clone/core-client/ChoiceMeta';
import { LocalPlayer } from '../../../src/client/local-player/LocalPlayer';
import { InProcessTransport } from '../../helpers/transportFixtures';

class TestCivilization extends Civilization {}
class TestCivilization2 extends Civilization {}

class TestLeader extends Leader {
  static civilization(): typeof Civilization {
    return TestCivilization;
  }
}

const leaderRegistry = new LeaderRegistry();
leaderRegistry.register(TestLeader);

describe('Transport correlation IDs', () => {
  it('assigns a unique correlationId to each request, never reusing within a session', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const meta = new ChoiceMeta(
      [TestCivilization, TestCivilization2],
      'choose-civilization'
    );

    // Start two concurrent chooseFromList calls so both requests are
    // dispatched before either resolves.
    const p1 = localPlayer.chooseFromList(meta);
    const p2 = localPlayer.chooseFromList(meta);

    expect(transport.sentRequests.length).toBe(2);

    const id1 = transport.sentRequests[0].correlationId;
    const id2 = transport.sentRequests[1].correlationId;

    // IDs must be non-empty strings
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
    expect(typeof id2).toBe('string');
    expect(id2.length).toBeGreaterThan(0);

    // IDs must be distinct
    expect(id1).not.toBe(id2);

    // Resolve both to avoid unhandled-rejection warnings
    transport.respondTo(id1, 0);
    transport.respondTo(id2, 0);
    await p1;
    await p2;
  });

  it('generates distinct IDs across many sequential requests', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const meta = new ChoiceMeta([TestCivilization], 'choose-civilization');

    const ids = new Set<string>();

    for (let i = 0; i < 10; i++) {
      const p = localPlayer.chooseFromList(meta);
      const req = transport.sentRequests[transport.sentRequests.length - 1];
      ids.add(req.correlationId);
      transport.respondTo(req.correlationId, 0);
      await p;
    }

    // All 10 IDs are unique
    expect(ids.size).toBe(10);
  });
});

