export type SessionStatus = 'idle' | 'starting' | 'active' | 'failed';

export type StartupFailureCode =
  | 'module_init'
  | 'participant_create'
  | 'registry_bind'
  | 'transport'
  | 'unknown';

export interface StartGameRequest {
  requestId: string;
  requestedAt: number;
  source: 'ui_button';
}

export interface StartupFailure {
  code: StartupFailureCode;
  message: string;
  recoverable: true;
  detectedAt: number;
}

export interface ParticipantSummary {
  totalParticipants: 3;
  localParticipants: 1;
  aiParticipants: 2;
  allRegistered: boolean;
}

export interface ParticipantRegistration {
  participantId: string;
  role: 'local_human' | 'ai';
  playerId: string;
  clientType: 'local_player' | 'ai_client';
  registered: boolean;
}

export interface StartGameResult {
  requestId: string;
  status: 'started' | 'already_started' | 'failed';
  sessionId?: string;
  participantSummary?: ParticipantSummary;
  failure?: StartupFailure;
}

export interface SessionStateView {
  sessionId?: string;
  status: SessionStatus;
  canStart: boolean;
  startupFailure?: StartupFailure;
}

export interface MandatoryActionView {
  actionId: string;
  label: string;
  description?: string;
  turnToken: string;
  metadata?: Record<string, unknown>;
}

export interface MandatoryActionsAvailable {
  sessionId: string;
  playerId: string;
  turnToken: string;
  actions: MandatoryActionView[];
  updatedAt: number;
}

export interface StartupSessionSnapshot {
  sessionId?: string;
  status: SessionStatus;
  participantSummary?: ParticipantSummary;
  failure?: StartupFailure;
}

export const createStartedResult = (
  requestId: string,
  sessionId: string,
  allRegistered: boolean
): StartGameResult => ({
  requestId,
  status: 'started',
  sessionId,
  participantSummary: {
    totalParticipants: 3,
    localParticipants: 1,
    aiParticipants: 2,
    allRegistered,
  },
});

export const createAlreadyStartedResult = (
  requestId: string,
  sessionId?: string,
  participantSummary?: ParticipantSummary
): StartGameResult => ({
  requestId,
  status: 'already_started',
  sessionId,
  participantSummary,
});

export const createFailedResult = (
  requestId: string,
  failure: StartupFailure
): StartGameResult => ({
  requestId,
  status: 'failed',
  failure,
});

