import { BackendRelayPort, RelaySubmitResult } from './backendRelay';
import { mapBackendActionToMandatoryActionView } from './mandatoryActionMapper';
import {
  BackendCommandRequest,
  CommandStatus,
  MandatoryActionView,
} from './types';

export interface BackendClientApi {
  getActivePlayerId(): Promise<string>;
  getMandatoryActions(playerId: string): Promise<
    Array<{
      id: string;
      label: string;
      description?: string;
      type: string;
      turnToken: string;
      metadata?: Record<string, unknown>;
      playerId: string;
    }>
  >;
  submitCommand(request: BackendCommandRequest): Promise<{
    requestId: string;
    status: Exclude<CommandStatus, 'interpretation_error'>;
    message: string;
    updatedMandatoryActions?: Array<{
      id: string;
      label: string;
      description?: string;
      type: string;
      turnToken: string;
      metadata?: Record<string, unknown>;
      playerId: string;
    }>;
  }>;
  getLastKnownTurnToken(playerId: string): Promise<string | undefined>;
}

export class BackendRelayClient implements BackendRelayPort {
  constructor(private readonly backendApi: BackendClientApi) {}

  async getActivePlayerId(): Promise<string> {
    return this.backendApi.getActivePlayerId();
  }

  async getMandatoryActions(playerId: string): Promise<
    Array<{
      id: string;
      label: string;
      description?: string;
      type: string;
      turnToken: string;
      metadata?: Record<string, unknown>;
      playerId: string;
    }>
  > {
    return this.backendApi.getMandatoryActions(playerId);
  }

  async getLastKnownTurnToken(playerId: string): Promise<string | undefined> {
    return this.backendApi.getLastKnownTurnToken(playerId);
  }

  async submitCommand(
    request: BackendCommandRequest
  ): Promise<RelaySubmitResult> {
    try {
      const backendResponse = await this.backendApi.submitCommand(request);
      const actionSource = backendResponse.updatedMandatoryActions
        ? backendResponse.updatedMandatoryActions
        : await this.backendApi.getMandatoryActions(request.playerId);

      return {
        requestId: backendResponse.requestId,
        status: backendResponse.status,
        message: backendResponse.message,
        updatedMandatoryActions: actionSource.map(
          mapBackendActionToMandatoryActionView
        ),
      };
    } catch (error) {
      const refreshedActions = await this.safeRefresh(request.playerId);

      return {
        requestId: request.requestId,
        status: 'transport_error',
        message:
          error instanceof Error
            ? error.message
            : 'Backend transport error occurred.',
        updatedMandatoryActions: refreshedActions,
      };
    }
  }

  private async safeRefresh(playerId: string): Promise<MandatoryActionView[]> {
    try {
      const actions = await this.backendApi.getMandatoryActions(playerId);

      return actions.map(mapBackendActionToMandatoryActionView);
    } catch {
      return [];
    }
  }
}
