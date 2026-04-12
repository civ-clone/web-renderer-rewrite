import CivClient from '@civ-clone/core-civ-client/Client';
import {
  ChoiceMeta,
  DataForChoiceMeta,
} from '@civ-clone/core-client/ChoiceMeta';
import LeaderRegistry, {
  instance as leaderRegistryInstance,
} from '@civ-clone/core-civilization/LeaderRegistry';
import MandatoryPlayerAction from '@civ-clone/core-player/MandatoryPlayerAction';
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

interface MandatoryActionResponsePayload {
  actionIndex: number;
  selection?: unknown;
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
      const response = await this.sendAndAwait(request);
      const { actionIndex, selection } =
        this.parseMandatoryActionResponse(response.payload);

      if (actionIndex < 0 || actionIndex >= actions.length) {
        throw new RangeError(
          `LocalPlayer: invalid mandatory action index ${actionIndex} (actions.length=${actions.length})`
        );
      }

      await this.performMandatoryAction(actions[actionIndex], selection);
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
      try {
        this.transport.send(request);
      } catch (error) {
        clearTimeout(timer);
        this.pendingRequests.delete(request.correlationId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private parseMandatoryActionResponse(
    payload: unknown
  ): MandatoryActionResponsePayload {
    if (typeof payload === 'number') {
      return { actionIndex: payload };
    }

    if (typeof payload !== 'object' || payload === null) {
      throw new TypeError(
        `LocalPlayer: invalid mandatory-action payload ${String(payload)}`
      );
    }

    const record = payload as Record<string, unknown>;
    const actionIndex = record['actionIndex'];

    if (!Number.isInteger(actionIndex)) {
      throw new TypeError(
        `LocalPlayer: mandatory-action payload requires integer actionIndex, got ${String(actionIndex)}`
      );
    }

    return {
      actionIndex: actionIndex as number,
      selection: record['selection'],
    };
  }

  private asSelectionIndex(selection: unknown, length: number): number | null {
    if (!Number.isInteger(selection)) {
      return null;
    }

    const index = selection as number;

    if (index < 0 || index >= length) {
      throw new RangeError(
        `LocalPlayer: selection index ${index} out of range (length=${length})`
      );
    }

    return index;
  }

  private async performMandatoryAction(
    action: MandatoryPlayerAction,
    selection?: unknown
  ): Promise<void> {
    const value = action.value() as unknown;

    if (typeof value === 'function') {
      await Promise.resolve((value as (selection?: unknown) => unknown)(selection));
      return;
    }

    if (typeof value !== 'object' || value === null) {
      throw new TypeError(
        `LocalPlayer: unsupported mandatory action value type for ${action.constructor.name}`
      );
    }

    const executable = value as {
      execute?: (selection?: unknown) => unknown;
      available?: () => unknown[];
      research?: (advance: unknown) => void;
      build?: (item: unknown) => void;
      actions?: () => unknown[];
      action?: (selectedAction: unknown) => void;
      activate?: () => void;
    };

    if (typeof executable.execute === 'function') {
      await Promise.resolve(executable.execute(selection));
      return;
    }

    if (
      typeof executable.available === 'function' &&
      typeof executable.research === 'function'
    ) {
      const available = executable.available();
      const selected = this.asSelectionIndex(selection, available.length);

      if (selected === null) {
        throw new TypeError(
          'LocalPlayer: research action requires integer `selection` index'
        );
      }

      executable.research(available[selected]);
      return;
    }

    if (
      typeof executable.available === 'function' &&
      typeof executable.build === 'function'
    ) {
      const available = executable.available();
      const selected = this.asSelectionIndex(selection, available.length);

      if (selected === null) {
        throw new TypeError(
          'LocalPlayer: city-build action requires integer `selection` index'
        );
      }

      const buildItem = available[selected] as { item?: () => unknown };
      executable.build(
        buildItem && typeof buildItem.item === 'function'
          ? buildItem.item()
          : buildItem
      );
      return;
    }

    if (
      typeof executable.actions === 'function' &&
      typeof executable.action === 'function'
    ) {
      const actions = executable.actions();
      const selected = this.asSelectionIndex(selection, actions.length);

      if (selected === null) {
        if (typeof executable.activate === 'function') {
          executable.activate();
          return;
        }

        throw new TypeError(
          'LocalPlayer: unit action requires integer `selection` index'
        );
      }

      executable.action(actions[selected]);
      return;
    }

    if (typeof executable.activate === 'function' && selection === undefined) {
      executable.activate();
      return;
    }

    throw new TypeError(
      `LocalPlayer: unsupported mandatory action value for ${action.constructor.name}`
    );
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
