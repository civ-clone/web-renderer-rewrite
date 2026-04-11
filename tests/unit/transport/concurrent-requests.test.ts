import { describe, expect, it } from 'vitest';
import Civilization from '@civ-clone/core-civilization/Civilization';
import Leader from '@civ-clone/core-civilization/Leader';
import LeaderRegistry from '@civ-clone/core-civilization/LeaderRegistry';
import Player from '@civ-clone/core-player/Player';
import { ChoiceMeta } from '@civ-clone/core-client/ChoiceMeta';
import { LocalPlayer } from '../../../src/client/local-player/LocalPlayer';
import { InProcessTransport } from '../../helpers/transportFixtures';

class TestCivA extends Civilization {}
class TestCivB extends Civilization {}

class TestLeader extends Leader {
  static civilization(): typeof Civilization {
    return TestCivA;
  }
}

const leaderRegistry = new LeaderRegistry();
leaderRegistry.register(TestLeader);

describe('Concurrent transport requests', () => {
  it('two concurrent in-flight requests each resolve with their own response', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const meta = new ChoiceMeta(
      [TestCivA, TestCivB],
      'choose-civilization'
    );

    // Start two concurrent requests without awaiting either
    const p1 = localPlayer.chooseFromList(meta);
    const p2 = localPlayer.chooseFromList(meta);

    expect(transport.sentRequests.length).toBe(2);

    const req1 = transport.sentRequests[0];
    const req2 = transport.sentRequests[1];

    // Deliberately respond to request-2 first, then request-1, to confirm
    // cross-contamination cannot happen regardless of response order.
    transport.respondTo(req2.correlationId, 1); // index 1 → TestCivB
    transport.respondTo(req1.correlationId, 0); // index 0 → TestCivA

    const result1 = await p1;
    const result2 = await p2;

    expect(result1).toBe(TestCivA); // p1 must receive response for req1
    expect(result2).toBe(TestCivB); // p2 must receive response for req2
  });

  it('100% of responses are matched to their correct pending request', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const meta = new ChoiceMeta([TestCivA, TestCivB], 'choose-civilization');

    // Queue four concurrent requests
    const promises = [
      localPlayer.chooseFromList(meta),
      localPlayer.chooseFromList(meta),
      localPlayer.chooseFromList(meta),
      localPlayer.chooseFromList(meta),
    ];

    expect(transport.sentRequests.length).toBe(4);

    const indices = [1, 0, 1, 0]; // alternate selections
    const expectedValues = [TestCivB, TestCivA, TestCivB, TestCivA];

    // Respond in reverse order to maximise cross-contamination risk
    for (let i = transport.sentRequests.length - 1; i >= 0; i--) {
      transport.respondTo(transport.sentRequests[i].correlationId, indices[i]);
    }

    const results = await Promise.all(promises);

    results.forEach((result, i) => {
      expect(result).toBe(expectedValues[i]);
    });
  });
});

