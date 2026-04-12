import type { SessionStatus } from '../../js/new-game/contracts';
export type { SessionStatus };

export type FrontendIntentType = string;

export interface MandatoryActionView {
  actionId: string;
  label: string;
  description?: string;
  turnToken?: string;
  intentType?: FrontendIntentType;
  metadata?: Record<string, unknown>;
}

export interface LocalPlayerSessionView {
  sessionId?: string;
  status: SessionStatus;
  canStart: boolean;
  startupFailureMessage?: string;
}



