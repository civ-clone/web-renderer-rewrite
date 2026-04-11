import { BackendClientApi } from '../../src/client/local-player/backendRelayClient';
import {
  BackendCommandRequest,
  FrontendCommandIntent,
} from '../../src/client/local-player/types';

export const fixedPlayerId = 'player-1';
export const fixedTurnToken = 'turn-1';

export const createIntent = (
  overrides: Partial<FrontendCommandIntent> = {}
): FrontendCommandIntent => ({
  intentId: 'intent-1',
  type: 'move-unit',
  actionId: 'action-1',
  turnToken: fixedTurnToken,
  payload: { unitId: 'unit-1', to: { x: 2, y: 3 } },
  submittedAt: 1000,
  ...overrides,
});

export const baseMandatoryActions = [
  {
    id: 'action-1',
    label: 'Move unit',
    description: 'Move the selected unit to a neighboring tile.',
    type: 'move-unit',
    turnToken: fixedTurnToken,
    metadata: { unitId: 'unit-1' },
    playerId: fixedPlayerId,
  },
  {
    id: 'action-2',
    label: 'Choose research',
    description: 'Select the next technology to research.',
    type: 'set-research',
    turnToken: fixedTurnToken,
    metadata: { options: ['pottery', 'bronze-working'] },
    playerId: fixedPlayerId,
  },
];

export interface StubOptions {
  throwOnSubmit?: boolean;
  rejectSubmission?: boolean;
  staleTurnToken?: string;
}

export const createBackendStub = (options: StubOptions = {}): BackendClientApi & {
  submissions: BackendCommandRequest[];
} => {
  const submissions: BackendCommandRequest[] = [];

  return {
    submissions,
    async getActivePlayerId() {
      return fixedPlayerId;
    },
    async getMandatoryActions() {
      return baseMandatoryActions;
    },
    async getLastKnownTurnToken() {
      return options.staleTurnToken ?? fixedTurnToken;
    },
    async submitCommand(request: BackendCommandRequest) {
      submissions.push(request);

      if (options.throwOnSubmit) {
        throw new Error('network offline');
      }

      if (options.rejectSubmission) {
        return {
          requestId: request.requestId,
          status: 'rejected' as const,
          message: 'Action is stale for this turn.',
          updatedMandatoryActions: baseMandatoryActions,
        };
      }

      return {
        requestId: request.requestId,
        status: 'success' as const,
        message: 'Action submitted successfully.',
        updatedMandatoryActions: baseMandatoryActions,
      };
    },
  };
};

