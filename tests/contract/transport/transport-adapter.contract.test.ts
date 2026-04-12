/**
 * Transport Adapter Contract Test (SC-002)
 *
 * Proves that replacing the transport adapter requires ZERO changes to
 * LocalPlayer or engine source code. The same `takeTurn()` and
 * `chooseFromList()` scenarios are executed against every registered adapter;
 * all must produce identical outcomes.
 *
 * US3: PostMessageTransportAdapter + MockElectronIpcTransport
 * US4: MockWebSocketTransport (added below, with artificial latency)
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Civilization from '@civ-clone/core-civilization/Civilization';
import Leader from '@civ-clone/core-civilization/Leader';
import LeaderRegistry from '@civ-clone/core-civilization/LeaderRegistry';
import MandatoryPlayerAction from '@civ-clone/core-player/MandatoryPlayerAction';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import { ChoiceMeta } from '@civ-clone/core-client/ChoiceMeta';
import { LocalPlayer } from '../../../src/client/local-player/LocalPlayer';
import { PostMessageTransportAdapter } from '../../../src/transport/adapters/PostMessageTransportAdapter';
import type { ITransport } from '../../../src/transport/ITransport';
import type { ITransportListener } from '../../../src/transport/ITransportListener';
import type { TransportRequest, TransportResponse } from '../../../src/transport/TransportMessage';
import {
  InProcessTransport,
  MockElectronIpcTransport,
  MockWebSocketTransport,
} from '../../helpers/transportFixtures';

// ---------------------------------------------------------------------------
// StubPlayer — controllable mandatory-action queue for contract tests
// ---------------------------------------------------------------------------

class StubPlayer extends Player {
  private _mandatory: MandatoryPlayerAction[] = [];

  constructor() {
    super(new RuleRegistry());
  }

  override hasMandatoryActions(): boolean {
    return this._mandatory.length > 0;
  }

  override mandatoryActions(): MandatoryPlayerAction[] {
    return [...this._mandatory];
  }

  addMandatoryAction(value: unknown): void {
    this._mandatory.push(new MandatoryPlayerAction(this, value));
  }

  addExecutableMandatoryAction(execute: () => void): void {
    this.addMandatoryAction({ execute });
  }

  clearMandatoryActions(): void {
    this._mandatory = [];
  }
}

// ---------------------------------------------------------------------------
// Test civilizations
// ---------------------------------------------------------------------------

class CivX extends Civilization {}
class CivY extends Civilization {}

class XLeader extends Leader {
  static civilization(): typeof Civilization {
    return CivX;
  }
}

const leaderRegistry = new LeaderRegistry();
leaderRegistry.register(XLeader);

// ---------------------------------------------------------------------------
// PostMessageTransportAdapter glue
//
// The adapter calls globalThis.postMessage (send) and registers on
// globalThis.addEventListener('message', …) (receive). In a Node test
// environment neither exists by default, so we install minimal stubs.
// ---------------------------------------------------------------------------

type MessageHandler = (event: { data: unknown }) => void;

interface PostMessageGlobals {
  postMessage?: (data: unknown) => void;
  addEventListener?: (name: string, handler: MessageHandler) => void;
}

class PostMessageAdapterHarness implements ITransport, ITransportListener {
  private readonly adapter: PostMessageTransportAdapter;
  public readonly sentRequests: TransportRequest[] = [];
  private readonly listeners: MessageHandler[] = [];

  constructor() {
    // Install stubs on globalThis so the adapter's send/receive work
    (globalThis as PostMessageGlobals).postMessage = (data: unknown) => {
      this.sentRequests.push(data as TransportRequest);
    };
    (globalThis as PostMessageGlobals).addEventListener = (
      name: string,
      handler: MessageHandler
    ) => {
      if (name === 'message') {
        this.listeners.push(handler);
      }
    };

    this.adapter = new PostMessageTransportAdapter();
  }

  send(request: TransportRequest): void {
    this.adapter.send(request);
  }

  onMessage(handler: (response: TransportResponse) => void): void {
    this.adapter.onMessage(handler);
  }

  /** Deliver a response through the adapter's real listener pathway. */
  respond(response: TransportResponse): void {
    this.listeners.forEach((h) => h({ data: response }));
  }

  respondToLast(payload: unknown): void {
    const last = this.sentRequests[this.sentRequests.length - 1];
    if (!last) throw new Error('PostMessageAdapterHarness: no pending requests');
    this.respond({ correlationId: last.correlationId, payload });
  }

  respondTo(correlationId: string, payload: unknown): void {
    this.respond({ correlationId, payload });
  }

  teardown(): void {
    delete (globalThis as PostMessageGlobals).postMessage;
    delete (globalThis as PostMessageGlobals).addEventListener;
  }
}

// ---------------------------------------------------------------------------
// Shared scenario runners
// ---------------------------------------------------------------------------

async function runTakeTurnRoundTrip(
  transport: {
    sentRequests: TransportRequest[];
    respondToLast: (payload: unknown) => void;
  } & ITransport &
    ITransportListener
): Promise<void> {
  const player = new StubPlayer();
  player.addExecutableMandatoryAction(() => player.clearMandatoryActions());

  const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
    timeoutMs: 5000,
  });

  const turnPromise = localPlayer.takeTurn();

  expect(transport.sentRequests.length).toBe(1);
  expect(transport.sentRequests[0].type).toBe('mandatory-action');

  // Resolve selected mandatory action
  transport.respondToLast({ actionIndex: 0 });

  await expect(turnPromise).resolves.toBeUndefined();
}

async function runChooseFromListRoundTrip(
  transport: {
    sentRequests: TransportRequest[];
    respondToLast: (payload: unknown) => void;
  } & ITransport &
    ITransportListener
): Promise<void> {
  const player = new Player();
  const meta = new ChoiceMeta([CivX, CivY], 'choose-civilization');

  const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
    timeoutMs: 5000,
  });

  const promise = localPlayer.chooseFromList(meta);

  expect(transport.sentRequests.length).toBe(1);
  expect(transport.sentRequests[0].type).toBe('choice-list');

  transport.respondToLast(1); // select CivY

  const result = await promise;
  expect(result).toBe(CivY);
}

// ---------------------------------------------------------------------------
// US3: PostMessageTransportAdapter
// ---------------------------------------------------------------------------

describe('PostMessageTransportAdapter contract', () => {
  let harness: PostMessageAdapterHarness;

  beforeEach(() => {
    harness = new PostMessageAdapterHarness();
  });

  afterEach(() => {
    harness.teardown();
  });

  it('takeTurn() round-trip produces the correct outcome', async () => {
    await runTakeTurnRoundTrip(harness);
  });

  it('chooseFromList() round-trip produces the correct outcome', async () => {
    await runChooseFromListRoundTrip(harness);
  });
});

// ---------------------------------------------------------------------------
// US3: MockElectronIpcTransport
// ---------------------------------------------------------------------------

describe('MockElectronIpcTransport contract', () => {
  it('takeTurn() round-trip produces identical outcome to PostMessage adapter', async () => {
    await runTakeTurnRoundTrip(new MockElectronIpcTransport());
  });

  it('chooseFromList() round-trip produces identical outcome to PostMessage adapter', async () => {
    await runChooseFromListRoundTrip(new MockElectronIpcTransport());
  });
});

// ---------------------------------------------------------------------------
// US4: MockWebSocketTransport with artificial latency
// ---------------------------------------------------------------------------

describe('MockWebSocketTransport contract (async latency)', () => {
  it('takeTurn() round-trip resolves correctly despite simulated network latency', async () => {
    const latencyMs = 10;
    const transport = new MockWebSocketTransport(latencyMs);

    const player = new StubPlayer();
    player.addExecutableMandatoryAction(() => player.clearMandatoryActions());

    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const turnPromise = localPlayer.takeTurn();

    expect(transport.sentRequests.length).toBe(1);
    expect(transport.sentRequests[0].type).toBe('mandatory-action');

    // respondToLast will schedule the handler call after `latencyMs`
    transport.respondToLast({ actionIndex: 0 });

    // takeTurn() must resolve after the simulated network delay
    await expect(turnPromise).resolves.toBeUndefined();
  });

  it('chooseFromList() round-trip resolves correctly with latency-delayed response', async () => {
    const latencyMs = 15;
    const transport = new MockWebSocketTransport(latencyMs);

    const player = new Player();
    const meta = new ChoiceMeta([CivX, CivY], 'choose-civilization');

    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000,
    });

    const promise = localPlayer.chooseFromList(meta);

    transport.respondToLast(0); // select CivX after latency

    const result = await promise;
    expect(result).toBe(CivX);
  });

  it('a delayed-but-within-timeout response is NOT prematurely rejected', async () => {
    const latencyMs = 30;
    const transport = new MockWebSocketTransport(latencyMs);

    const player = new Player();
    const meta = new ChoiceMeta([CivX, CivY], 'choose-civilization');

    const localPlayer = new LocalPlayer(player, leaderRegistry, transport, {
      timeoutMs: 5000, // well beyond the latency
    });

    const promise = localPlayer.chooseFromList(meta);

    transport.respondToLast(1);

    await expect(promise).resolves.toBe(CivY);
  });
});

