import {
  BackendCommandRequest,
  CommandStatus,
  MandatoryActionView,
} from './types';

export interface BackendMandatoryAction {
  id: string;
  label: string;
  description?: string;
  type: string;
  turnToken: string;
  metadata?: Record<string, unknown>;
  playerId: string;
}

export interface BackendSubmitResponse {
  requestId: string;
  status: Exclude<CommandStatus, 'interpretation_error'>;
  message: string;
  updatedMandatoryActions: BackendMandatoryAction[];
}

export interface BackendRelayPort {
  getActivePlayerId(): Promise<string>;
  getMandatoryActions(playerId: string): Promise<BackendMandatoryAction[]>;
  submitCommand(request: BackendCommandRequest): Promise<RelaySubmitResult>;
  getLastKnownTurnToken(playerId: string): Promise<string | undefined>;
}

export interface RelaySubmitResult {
  requestId: string;
  status: Exclude<CommandStatus, 'interpretation_error'>;
  message: string;
  updatedMandatoryActions: MandatoryActionView[];
}
