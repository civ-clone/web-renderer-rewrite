import { describe, expect, it } from 'vitest';
import Civilization from '@civ-clone/core-civilization/Civilization';
import Leader from '@civ-clone/core-civilization/Leader';
import LeaderRegistry from '@civ-clone/core-civilization/LeaderRegistry';
import Player from '@civ-clone/core-player/Player';
import { ChoiceMeta } from '@civ-clone/core-client/ChoiceMeta';
import { LocalPlayer } from '../../../src/client/local-player/LocalPlayer';
import { InProcessTransport } from '../../helpers/transportFixtures';

class CivAlpha extends Civilization {}
class CivBeta extends Civilization {}
class CivGamma extends Civilization {}

class AlphaLeader extends Leader {
  static civilization(): typeof Civilization {
    return CivAlpha;
  }
}

const leaderRegistry = new LeaderRegistry();
leaderRegistry.register(AlphaLeader);

describe('chooseFromList() round-trip integration', () => {
  it('returns the choice at the index specified by the transport response', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const meta = new ChoiceMeta(
      [CivAlpha, CivBeta, CivGamma],
      'choose-civilization'
    );

    const promise = localPlayer.chooseFromList(meta);

    // Verify the dispatched request
    expect(transport.sentRequests.length).toBe(1);
    const req = transport.sentRequests[0];
    expect(req.type).toBe('choice-list');
    expect(typeof req.correlationId).toBe('string');
    expect(req.correlationId.length).toBeGreaterThan(0);

    // Payload must include the serialised choice list
    const choices = req.payload['choices'] as Array<{ index: number }>;
    expect(Array.isArray(choices)).toBe(true);
    expect(choices.length).toBe(3);

    // Respond with index 2 → CivGamma
    transport.respondToLast(2);

    const result = await promise;
    expect(result).toBe(CivGamma);
  });

  it('handles sequential chooseFromList() calls correctly', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const meta = new ChoiceMeta(
      [CivAlpha, CivBeta, CivGamma],
      'choose-civilization'
    );

    // First call — choose index 1
    const p1 = localPlayer.chooseFromList(meta);
    transport.respondToLast(1);
    const r1 = await p1;
    expect(r1).toBe(CivBeta);

    // Second call — choose index 0
    const p2 = localPlayer.chooseFromList(meta);
    transport.respondToLast(0);
    const r2 = await p2;
    expect(r2).toBe(CivAlpha);
  });

  it('carries the choice-list key in the payload', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const meta = new ChoiceMeta([CivAlpha], 'choose-civilization');
    const promise = localPlayer.chooseFromList(meta);

    expect(transport.sentRequests[0].payload['key']).toBe('choose-civilization');

    transport.respondToLast(0);
    await promise;
  });

  it('concurrent chooseFromList() calls: each receives the correct selection', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const meta = new ChoiceMeta(
      [CivAlpha, CivBeta, CivGamma],
      'choose-civilization'
    );

    const p1 = localPlayer.chooseFromList(meta);
    const p2 = localPlayer.chooseFromList(meta);

    const req1 = transport.sentRequests[0];
    const req2 = transport.sentRequests[1];

    // Respond out-of-order
    transport.respondTo(req2.correlationId, 2); // p2 → CivGamma
    transport.respondTo(req1.correlationId, 0); // p1 → CivAlpha

    expect(await p1).toBe(CivAlpha);
    expect(await p2).toBe(CivGamma);
  });
});

