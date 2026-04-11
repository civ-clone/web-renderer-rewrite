import CivClient from '@civ-clone/core-civ-client/Client';
import {
  ChoiceMeta,
  DataForChoiceMeta,
} from '@civ-clone/core-client/ChoiceMeta';
import LeaderRegistry, {
  instance as leaderRegistryInstance,
} from '@civ-clone/core-civilization/LeaderRegistry';
import Player from '@civ-clone/core-player/Player';
import type { ITransport } from '../../transport/ITransport.js';
import type { ITransportListener } from '../../transport/ITransportListener.js';
import { TransportTimeoutError } from '../../transport/TransportMessage.js';
import type {
  TransportRequest,
  TransportResponse,
} from '../../transport/TransportMessage.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns a string that is unique within a JS session. */
function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 11)}`;
}

interface PendingEntry {
  resolve: (response: TransportResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// LocalPlayerOptions
// ---------------------------------------------------------------------------

export interface LocalPlayerOptions {
  /**
   * Maximum milliseconds to wait for a matching TransportResponse before
   * rejecting with a `TransportTimeoutError`. Defaults to 30 000 ms.
   */
  timeoutMs?: number;
  /** Custom random-number generator forwarded to the CivClient base class. */
  randomNumberGenerator?: () => number;
}

// ---------------------------------------------------------------------------
// LocalPlayer
// ---------------------------------------------------------------------------

/**
 * Human-player client that runs in the engine execution context.
 *
 * `takeTurn()` and
 * `chooseFromList()` serialise their payloads into a structured-clone-safe
 * `TransportRequest`, dispatch it through the transport, and await a matching
 * `TransportResponse` identified by a unique `correlationId`.
 */
export class LocalPlayer extends CivClient {
  private readonly transport: ITransport & ITransportListener;
  private readonly pendingRequests = new Map<string, PendingEntry>();
  private readonly timeoutMs: number;

  constructor(
    player: Player,
    leaderRegistry: LeaderRegistry = leaderRegistryInstance,
    transport: ITransport & ITransportListener,
    options: LocalPlayerOptions = {}
  ) {
    super(player, leaderRegistry, options.randomNumberGenerator);

    this.transport = transport;
    this.timeoutMs = options.timeoutMs ?? 30_000;

    this.transport.onMessage((response) =>
      this.handleIncomingResponse(response)
    );
  }

  // ---------------------------------------------------------------------------
  // IClient — takeTurn
  // ---------------------------------------------------------------------------

  /**
   * While the player has mandatory actions, serialises them into a
   * `TransportRequest` and awaits a `TransportResponse` from the frontend.
   * Resolves when `player.hasMandatoryActions()` returns false.
   *
   */
  async takeTurn(): Promise<void> {
    while (this.player().hasMandatoryActions()) {
      const actions = this.player().mandatoryActions();

      const request: TransportRequest = {
        correlationId: generateCorrelationId(),
        type: 'mandatory-action',
        payload: {
          actions: actions.map((_action, index) => ({ index })),
        },
      };

      // Dispatch and await the matching response.
      await this.sendAndAwait(request);
    }
  }

  // ---------------------------------------------------------------------------
  // IClient — chooseFromList
  // ---------------------------------------------------------------------------

  /**
   * Serialises the available choices into a `TransportRequest`, dispatches
   * them through the transport, and awaits the player's selected index as a
   * `TransportResponse`. Returns the corresponding choice value.
   *
   */
  async chooseFromList<Name extends keyof ChoiceMetaDataMap>(
    meta: ChoiceMeta<Name>
  ): Promise<DataForChoiceMeta<ChoiceMeta<Name>>> {
    const choices = meta.choices();

    const request: TransportRequest = {
      correlationId: generateCorrelationId(),
      type: 'choice-list',
      payload: {
        key: meta.key(),
        choices: choices.map((_choice, index) => ({ index })),
      },
    };

    const response = await this.sendAndAwait(request);
    const selectedIndex = response.payload as number;

    if (!Number.isInteger(selectedIndex)) {
      throw new TypeError(
        `LocalPlayer: expected integer choice index, got ${String(
          selectedIndex
        )}`
      );
    }

    if (selectedIndex < 0 || selectedIndex >= choices.length) {
      throw new RangeError(
        `LocalPlayer: invalid choice index ${selectedIndex} (choices.length=${choices.length})`
      );
    }

    return choices[selectedIndex].value();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private sendAndAwait(request: TransportRequest): Promise<TransportResponse> {
    return new Promise<TransportResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(request.correlationId);
        reject(new TransportTimeoutError(request.correlationId));
      }, this.timeoutMs);

      this.pendingRequests.set(request.correlationId, {
        resolve,
        reject,
        timer,
      });

      // Send after registering so the response can never arrive before the
      // resolver is in place.
      this.transport.send(request);
    });
  }

  private handleIncomingResponse(response: TransportResponse): void {
    const pending = this.pendingRequests.get(response.correlationId);

    if (!pending) {
      // Orphan response — silently discard (SC-003).
      return;
    }

    clearTimeout(pending.timer);
    this.pendingRequests.delete(response.correlationId);
    pending.resolve(response);
  }
}
