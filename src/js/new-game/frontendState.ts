import type {
  MandatoryActionView,
  SessionStateView,
  StartGameResult,
} from './contracts.js';
import {
  createIdleSessionState,
  transitionToActive,
  transitionToFailed,
} from './sessionState.js';

export interface FrontendNewGameState {
  session: SessionStateView;
  canStart: boolean;
  mandatoryActionsVisible: boolean;
  startupFailureMessage: string | null;
}

export const createFrontendNewGameState = (): FrontendNewGameState => ({
  session: createIdleSessionState(),
  canStart: true,
  mandatoryActionsVisible: false,
  startupFailureMessage: null,
});

export const shouldShowMandatoryActions = (
  session: SessionStateView,
  actions: MandatoryActionView[]
): boolean => session.status === 'active' && actions.length > 0;

export const reduceFrontendStateFromStartResult = (
  current: FrontendNewGameState,
  result: StartGameResult,
  now: number
): FrontendNewGameState => {
  if (result.status === 'started') {
    return {
      ...current,
      session: transitionToActive(result.sessionId ?? 'session-unknown', now),
      canStart: false,
      startupFailureMessage: null,
    };
  }

  if (result.status === 'already_started') {
    return {
      ...current,
      canStart: false,
    };
  }

  return {
    ...current,
    session: transitionToFailed(
      result.sessionId ?? current.session.sessionId ?? 'session-unknown',
      result.failure ?? {
        code: 'unknown',
        message: 'Startup failed for an unknown reason.',
        recoverable: true,
        detectedAt: now,
      }
    ),
    canStart: true,
    startupFailureMessage:
      result.failure?.message ?? 'Startup failed for an unknown reason.',
    mandatoryActionsVisible: false,
  };
};

