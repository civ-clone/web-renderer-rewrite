import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Civilization from '@civ-clone/core-civilization/Civilization';
import Leader from '@civ-clone/core-civilization/Leader';
import LeaderRegistry from '@civ-clone/core-civilization/LeaderRegistry';
import Player from '@civ-clone/core-player/Player';
import { ChoiceMeta } from '@civ-clone/core-client/ChoiceMeta';
import { LocalPlayer } from '../../../src/client/local-player/LocalPlayer';
import type { ITransport } from '../../../src/transport/ITransport';
import type { ITransportListener } from '../../../src/transport/ITransportListener';
import { TransportTimeoutError } from '../../../src/transport/TransportMessage';
import type {
  TransportRequest,
  TransportResponse,
} from '../../../src/transport/TransportMessage';
import { InProcessTransport } from '../../helpers/transportFixtures';

class TestCivilization extends Civilization {}

class TestLeader extends Leader {
  static civilization(): typeof Civilization {
    return TestCivilization;
  }
}

const leaderRegistry = new LeaderRegistry();
leaderRegistry.register(TestLeader);

describe('Pending request timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects with TransportTimeoutError when no response arrives within timeoutMs', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const timeoutMs = 100;
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs,
    });

    const meta = new ChoiceMeta([TestCivilization], 'choose-civilization');
    const promise = localPlayer.chooseFromList(meta);

    // Advance time past the timeout
    vi.advanceTimersByTime(timeoutMs + 10);

    await expect(promise).rejects.toThrow(TransportTimeoutError);
  });

  it('rejects with a TransportTimeoutError that carries the correlationId', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 50,
    });

    const meta = new ChoiceMeta([TestCivilization], 'choose-civilization');
    const promise = localPlayer.chooseFromList(meta);

    const correlationId = transport.sentRequests[0].correlationId;

    vi.advanceTimersByTime(100);

    const error = await promise.catch((e) => e);
    expect(error).toBeInstanceOf(TransportTimeoutError);
    expect((error as TransportTimeoutError).correlationId).toBe(correlationId);
  });

  it('clears the pending entry so a late-arriving response is silently discarded', async () => {
    const transport = new InProcessTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 50,
    });

    const meta = new ChoiceMeta([TestCivilization], 'choose-civilization');
    const promise = localPlayer.chooseFromList(meta);

    vi.advanceTimersByTime(100);
    await promise.catch(() => {
      /* expected */
    });

    // Sending a late response must not throw or cause any side-effect
    expect(() => transport.respondToLast(0)).not.toThrow();

    // LocalPlayer must still be usable after a timeout
    const p2 = localPlayer.chooseFromList(meta);
    transport.respondToLast(0);
    await expect(p2).resolves.toBe(TestCivilization);
  });

  it('rejects immediately if transport.send throws and remains usable afterward', async () => {
    class ThrowingSendTransport implements ITransport, ITransportListener {
      private handlers: Array<(response: TransportResponse) => void> = [];

      send(_request: TransportRequest): void {
        throw new Error('send failed');
      }

      onMessage(handler: (response: TransportResponse) => void): void {
        this.handlers.push(handler);
      }

      respond(_response: TransportResponse): void {
        this.handlers.forEach((handler) => handler(_response));
      }
    }

    const failingTransport = new ThrowingSendTransport();
    const player = new Player();
    const localPlayer = new LocalPlayer(player, leaderRegistry, failingTransport, {
      timeoutMs: 50,
    });
    const meta = new ChoiceMeta([TestCivilization], 'choose-civilization');

    await expect(localPlayer.chooseFromList(meta)).rejects.toThrow('send failed');

    // A healthy transport still works immediately after the failure path.
    const healthyTransport = new InProcessTransport();
    const healthyLocalPlayer = new LocalPlayer(
      player,
      leaderRegistry,
      healthyTransport,
      {
        timeoutMs: 50,
      }
    );

    const p2 = healthyLocalPlayer.chooseFromList(meta);
    healthyTransport.respondToLast(0);
    await expect(p2).resolves.toBe(TestCivilization);
  });
});

