import Client, { IClient } from '@civ-clone/core-client/Client';
import { ChoiceMeta, ChoiceMetaData, DataForChoiceMeta } from '@civ-clone/core-client/ChoiceMeta';
import Choice from '@civ-clone/core-client/Choice';
import Player from '@civ-clone/core-player/Player';
import { BackendRelayPort } from './backendRelay';
import { validateIntent } from './intentValidation';
import { intentToCommand } from './intentToCommand';
import { mapBackendActionToMandatoryActionView } from './mandatoryActionMapper';
import { normalizeCommandOutcome } from './normalizeCommandOutcome';
import { dedupeKeyFrom, SubmissionLockManager } from './submissionLock';
import {
  CommandOutcome,
  FrontendCommandIntent,
  LocalPlayerClientContract,
  MandatoryActionView,
} from './types';

export interface LocalPlayerOptions {
  supportedIntentTypes?: string[];
  lockManager?: SubmissionLockManager;
}

export class LocalPlayer extends Client implements LocalPlayerClientContract {
  private readonly supportedIntentTypes: string[];
  private readonly lockManager: SubmissionLockManager;
  private relay!: BackendRelayPort;
  private playerId!: string;

  constructor(
    playerOrRelay: Player | BackendRelayPort,
    relayOrPlayerId?: BackendRelayPort | string,
    playerId?: string,
    options?: LocalPlayerOptions
  ) {
    // Support both signatures:
    // (player, relay, playerId, options) - extends Client signature
    // (relay, playerId, options) - backward compat for LocalPlayerClientContract
    
    let player: Player;
    let relay: BackendRelayPort;
    let resolvedPlayerId: string;
    let opts: LocalPlayerOptions;

    // Detect signature: check if first arg has getActivePlayerId (relay) vs player() (player)
    if ('getActivePlayerId' in playerOrRelay) {
      // First signature: (relay, playerId, options) - backward compat
      relay = playerOrRelay as BackendRelayPort;
      resolvedPlayerId = relayOrPlayerId as string;
      opts = (playerId as LocalPlayerOptions) ?? {};
      // Create a minimal stub player for backward compatibility
      player = LocalPlayer.createStubPlayer(resolvedPlayerId);
    } else {
      // Second signature: (player, relay, playerId, options) - extends Client
      player = playerOrRelay as Player;
      relay = relayOrPlayerId as BackendRelayPort;
      resolvedPlayerId = playerId!;
      opts = options ?? {};
    }

    super(player);
    this.relay = relay;
    this.playerId = resolvedPlayerId;
    this.supportedIntentTypes = opts.supportedIntentTypes ?? ['default'];
    this.lockManager = opts.lockManager ?? new SubmissionLockManager();
  }

  private static createStubPlayer(id: string): Player {
    // Create a minimal stub player that satisfies the Player interface
    return {
      playerId(): string {
        return id;
      },
    } as unknown as Player;
  }

  async getMandatoryActions(): Promise<MandatoryActionView[]> {
    const mandatoryActions = await this.relay.getMandatoryActions(
      this.playerId
    );

    return mandatoryActions.map(mapBackendActionToMandatoryActionView);
  }

  async chooseFromList<Name extends keyof ChoiceMetaDataMap>(
    meta: ChoiceMeta<Name>
  ): Promise<DataForChoiceMeta<ChoiceMeta<Name>>> {
    const choices = meta.choices();
    const choice = await this.promptUserForChoice(choices);

    return choice.value();
  }

  async takeTurn(): Promise<void> {
    const mandatoryActions = await this.getMandatoryActions();

    if (mandatoryActions.length === 0) {
      return;
    }

    for (const action of mandatoryActions) {
      const intent: FrontendCommandIntent = {
        intentId: `turn-${Date.now()}-${Math.random()}`,
        type: action.intentType,
        actionId: action.actionId,
        turnToken: action.turnToken,
        payload: action.metadata ?? {},
        submittedAt: Date.now(),
      };

      const outcome = await this.submitIntent(intent);

      if (outcome.status === 'success') {
        continue;
      }

      if (!outcome.recoverable) {
        throw new Error(
          `Non-recoverable error during turn: ${outcome.message}`
        );
      }
    }
  }

  private async promptUserForChoice<T>(
    choices: Choice<T>[]
  ): Promise<Choice<T>> {
    // This is a placeholder implementation. In a real scenario, this would be
    // handled by the frontend UI. For now, we return the first choice.
    if (choices.length === 0) {
      throw new Error('No choices available');
    }

    return choices[0];
  }

  async submitIntent(intent: FrontendCommandIntent): Promise<CommandOutcome> {
    const request = intentToCommand(intent, this.playerId);
    const dedupeKey = dedupeKeyFrom(
      intent.actionId,
      intent.turnToken,
      this.playerId
    );

    if (this.lockManager.hasInFlight(dedupeKey)) {
      return normalizeCommandOutcome(
        {
          status: 'rejected',
          message: 'Duplicate submission ignored while action is in flight.',
          requestId: request.requestId,
          recoverable: true,
          updatedMandatoryActions: await this.getMandatoryActions(),
        },
        request.requestId
      );
    }

    const activePlayerId = await this.relay.getActivePlayerId();
    const lastKnownTurnToken = await this.relay.getLastKnownTurnToken(
      this.playerId
    );
    const validation = validateIntent(intent, {
      supportedIntentTypes: this.supportedIntentTypes,
      activePlayerId,
      expectedPlayerId: this.playerId,
      lastKnownTurnToken,
    });

    if (!validation.valid) {
      return normalizeCommandOutcome(
        {
          status: 'interpretation_error',
          message: validation.reason,
          requestId: request.requestId,
          recoverable: true,
          updatedMandatoryActions: await this.getMandatoryActions(),
        },
        request.requestId
      );
    }

    try {
      this.lockManager.acquire(dedupeKey, request.requestId);
    } catch {
      return normalizeCommandOutcome(
        {
          status: 'rejected',
          message: 'Duplicate submission ignored while action is in flight.',
          requestId: request.requestId,
          recoverable: true,
          updatedMandatoryActions: await this.getMandatoryActions(),
        },
        request.requestId
      );
    }

    try {
      const relayOutcome = await this.relay.submitCommand(request);

      return normalizeCommandOutcome(
        {
          status: relayOutcome.status,
          message: relayOutcome.message,
          requestId: relayOutcome.requestId,
          recoverable: relayOutcome.status !== 'success',
          updatedMandatoryActions: relayOutcome.updatedMandatoryActions,
        },
        request.requestId
      );
    } finally {
      this.lockManager.release(dedupeKey);
    }
  }
}
