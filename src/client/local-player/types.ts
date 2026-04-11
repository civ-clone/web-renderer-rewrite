export type CommandStatus =
  | 'success'
  | 'rejected'
  | 'transport_error'
  | 'interpretation_error';

export type FrontendIntentType = string;

export interface MandatoryActionView {
  actionId: string;
  label: string;
  description?: string;
  intentType: FrontendIntentType;
  turnToken: string;
  metadata?: Record<string, unknown>;
}

export interface FrontendCommandIntent {
  intentId: string;
  type: FrontendIntentType;
  actionId: string;
  turnToken: string;
  payload: Record<string, unknown>;
  submittedAt: number;
}

export interface BackendCommandRequest {
  commandType: string;
  playerId: string;
  turnToken: string;
  commandPayload: Record<string, unknown>;
  requestId: string;
}

export interface CommandOutcome {
  status: CommandStatus;
  message: string;
  requestId: string;
  updatedMandatoryActions: MandatoryActionView[];
  recoverable: boolean;
}

export interface LocalPlayerClientContract {
  getMandatoryActions(): Promise<MandatoryActionView[]>;
  submitIntent(intent: FrontendCommandIntent): Promise<CommandOutcome>;
}
