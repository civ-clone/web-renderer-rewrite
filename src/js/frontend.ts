import type {
  MandatoryActionView,
  SessionStateView,
  StartGameRequest,
  StartGameResult,
} from './new-game/contracts.js';
import {
  createFrontendNewGameState,
  reduceFrontendStateFromStartResult,
  shouldShowMandatoryActions,
  type FrontendNewGameState,
} from './new-game/frontendState.js';
import { renderMandatoryActions } from '../ui/mandatory-actions/renderMandatoryActions';
import { renderStartControl } from '../ui/new-game/renderStartControl.js';
import { showStartupFailure } from '../ui/new-game/showStartupFailure.js';

export interface FrontendRuntimeOptions {
  startGame: (request: StartGameRequest) => Promise<StartGameResult>;
  now?: () => number;
}

export interface FrontendRuntime {
  getState: () => FrontendNewGameState;
  clickStart: () => Promise<StartGameResult | null>;
  onMandatoryActions: (actions: MandatoryActionView[]) => string[];
  renderedStartControl: () => ReturnType<typeof renderStartControl>;
  sessionView: () => SessionStateView;
}

const createRequestId = (now: () => number): string =>
  `start-${now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const createFrontendRuntime = (
  options: FrontendRuntimeOptions
): FrontendRuntime => {
  const now = options.now ?? (() => Date.now());
  let state = createFrontendNewGameState();

  return {
    getState: () => state,
    sessionView: () => state.session,
    renderedStartControl: () =>
      renderStartControl(state.session, () => {
        // No-op in tests; `clickStart` drives orchestration.
      }),
    clickStart: async (): Promise<StartGameResult | null> => {
      if (!state.canStart) {
        return null;
      }

      const request: StartGameRequest = {
        requestId: createRequestId(now),
        requestedAt: now(),
        source: 'ui_button',
      };
      const result = await options.startGame(request);

      state = reduceFrontendStateFromStartResult(state, result, now());

      if (result.status === 'failed' && result.failure) {
        state = {
          ...state,
          startupFailureMessage: showStartupFailure(result.failure),
        };
      }

      return result;
    },
    onMandatoryActions: (actions: MandatoryActionView[]): string[] => {
      const visible = shouldShowMandatoryActions(state.session, actions);
      state = {
        ...state,
        mandatoryActionsVisible: visible,
      };

      return renderMandatoryActions(actions, {
        sessionStatus: state.session.status,
      });
    },
  };
};

