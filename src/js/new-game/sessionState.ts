import type {
  SessionStateView,
  StartupFailure,
  StartupSessionSnapshot,
} from './contracts.js';

export const createIdleSessionState = (): SessionStateView => ({
  status: 'idle',
  canStart: true,
});

export const transitionToStarting = (sessionId: string): SessionStateView => ({
  sessionId,
  status: 'starting',
  canStart: false,
});

export const transitionToActive = (
  sessionId: string,
  _startedAt: number
): SessionStateView => ({
  sessionId,
  status: 'active',
  canStart: false,
});

export const transitionToFailed = (
  sessionId: string,
  failure: StartupFailure
): SessionStateView => ({
  sessionId,
  status: 'failed',
  canStart: true,
  startupFailure: failure,
});

export const canAcceptStartRequest = (
  state: SessionStateView
): boolean => state.status === 'idle' || state.status === 'failed';

export const snapshotSessionState = (
  state: SessionStateView,
  participantSummary?: StartupSessionSnapshot['participantSummary']
): StartupSessionSnapshot => ({
  sessionId: state.sessionId,
  status: state.status,
  participantSummary,
  failure: state.startupFailure,
});

