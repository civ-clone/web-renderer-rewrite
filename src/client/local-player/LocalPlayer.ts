import CivClient from '@civ-clone/core-civ-client/Client';
import { EndTurn } from '@civ-clone/civ1-player/PlayerActions';
import { ActiveUnit } from '@civ-clone/civ1-unit/PlayerActions';
import ChooseResearch from '@civ-clone/civ1-science/PlayerActions/ChooseResearch';
import {
  ChoiceMeta,
  DataForChoiceMeta,
} from '@civ-clone/core-client/ChoiceMeta';
import CityBuild from '@civ-clone/core-city-build/PlayerActions/CityBuild';
import LeaderRegistry, {
  instance as leaderRegistryInstance,
} from '@civ-clone/core-civilization/LeaderRegistry';
import MandatoryPlayerAction from '@civ-clone/core-player/MandatoryPlayerAction';
import Player from '@civ-clone/core-player/Player';
import type { ITransport } from '../../transport/ITransport.js';
import type { ITransportListener } from '../../transport/ITransportListener.js';
import { TransportTimeoutError } from '../../transport/TransportMessage.js';
import {
  deserializeTransportResponse,
  serializeTransportRequest,
} from '../../transport/serde.js';
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
        this.transport.send(serializeTransportRequest(request));
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

    if (action instanceof EndTurn) {
      await this.performEndTurn(value, selection);
      return;
    }

    if (action instanceof ChooseResearch) {
      this.performChooseResearch(value, selection);
      return;
    }

    if (action instanceof CityBuild) {
      this.performCityBuild(value, selection);
      return;
    }

    if (action instanceof ActiveUnit) {
      this.performActiveUnit(value, selection);
      return;
    }

    // TODO: Introduce a pluggable action-handler registry so new PlayerActions
    // can be supported without editing LocalPlayer core logic.
    if (typeof value === 'function') {
      await Promise.resolve((value as () => unknown)());
      return;
    }

    if (typeof value !== 'object' || value === null) {
      throw new TypeError(
        `LocalPlayer: unsupported mandatory action value type for ${action.constructor.name}`
      );
    }

    const executable = value as { execute?: () => unknown };

    if (typeof executable.execute === 'function') {
      await Promise.resolve(executable.execute());
      return;
    }

    throw new TypeError(
      `LocalPlayer: unsupported mandatory action ${action.constructor.name}`
    );
  }

  private async performEndTurn(value: unknown, selection?: unknown): Promise<void> {
    if (typeof value === 'function') {
      await Promise.resolve((value as (selection?: unknown) => unknown)(selection));
      return;
    }

    if (typeof value !== 'object' || value === null) {
      throw new TypeError('LocalPlayer: EndTurn value is not executable');
    }

    const executable = value as { execute?: (selection?: unknown) => unknown };

    if (typeof executable.execute === 'function') {
      await Promise.resolve(executable.execute(selection));
      return;
    }

    throw new TypeError('LocalPlayer: EndTurn value is not executable');
  }

  private performChooseResearch(value: unknown, selection?: unknown): void {
    if (typeof value !== 'object' || value === null) {
      throw new TypeError('LocalPlayer: ChooseResearch value is not an object');
    }

    const research = value as {
      available?: () => unknown[];
      research?: (advance: unknown) => void;
    };

    if (
      typeof research.available === 'function' &&
      typeof research.research === 'function'
    ) {
      const available = research.available();
      const selected = this.asSelectionIndex(selection, available.length);

      if (selected === null) {
        throw new TypeError(
          'LocalPlayer: research action requires integer `selection` index'
        );
      }

      research.research(available[selected]);
      return;
    }

    throw new TypeError('LocalPlayer: ChooseResearch value is not executable');
  }

  private performCityBuild(value: unknown, selection?: unknown): void {
    if (typeof value !== 'object' || value === null) {
      throw new TypeError('LocalPlayer: CityBuild value is not an object');
    }

    const cityBuild = value as {
      available?: () => unknown[];
      build?: (item: unknown) => void;
    };

    if (
      typeof cityBuild.available === 'function' &&
      typeof cityBuild.build === 'function'
    ) {
      const available = cityBuild.available();
      const selected = this.asSelectionIndex(selection, available.length);

      if (selected === null) {
        throw new TypeError(
          'LocalPlayer: city-build action requires integer `selection` index'
        );
      }

      const buildItem = available[selected] as { item?: () => unknown };
      cityBuild.build(
        buildItem && typeof buildItem.item === 'function'
          ? buildItem.item()
          : buildItem
      );
      return;
    }

    throw new TypeError('LocalPlayer: CityBuild value is not executable');
  }

  private performActiveUnit(value: unknown, selection?: unknown): void {
    if (typeof value !== 'object' || value === null) {
      throw new TypeError('LocalPlayer: ActiveUnit value is not an object');
    }

    const unit = value as {
      actions?: () => unknown[];
      action?: (selectedAction: unknown) => void;
      activate?: () => void;
    };

    if (
      typeof unit.actions === 'function' &&
      typeof unit.action === 'function'
    ) {
      const actions = unit.actions();
      const selected = this.asSelectionIndex(selection, actions.length);

      if (selected === null) {
        if (typeof unit.activate === 'function') {
          unit.activate();
          return;
        }

        throw new TypeError(
          'LocalPlayer: unit action requires integer `selection` index'
        );
      }

      unit.action(actions[selected]);
      return;
    }

    if (typeof unit.activate === 'function' && selection === undefined) {
      unit.activate();
      return;
    }

    throw new TypeError('LocalPlayer: ActiveUnit value is not executable');
  }

  private handleIncomingResponse(response: TransportResponse): void {
    const normalizedResponse = deserializeTransportResponse(response);
    const pending = this.pendingRequests.get(normalizedResponse.correlationId);

    if (!pending) {
      // Orphan response — silently discard (SC-003).
      return;
    }

    clearTimeout(pending.timer);
    this.pendingRequests.delete(normalizedResponse.correlationId);
    pending.resolve(normalizedResponse);
  }
}
