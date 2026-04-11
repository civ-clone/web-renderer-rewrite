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

export class LocalPlayer implements LocalPlayerClientContract {
  private readonly supportedIntentTypes: string[];
  private readonly lockManager: SubmissionLockManager;

  constructor(
    private readonly relay: BackendRelayPort,
    private readonly playerId: string,
    options: LocalPlayerOptions = {}
  ) {
    this.supportedIntentTypes = options.supportedIntentTypes ?? ['default'];
    this.lockManager = options.lockManager ?? new SubmissionLockManager();
  }

  async getMandatoryActions(): Promise<MandatoryActionView[]> {
    const mandatoryActions = await this.relay.getMandatoryActions(
      this.playerId
    );

    return mandatoryActions.map(mapBackendActionToMandatoryActionView);
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
