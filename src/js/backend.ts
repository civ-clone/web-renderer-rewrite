import type {
  StartGameRequest,
  StartGameResult,
} from './new-game/contracts.js';
import {
  createStartNewGameOrchestrator,
  type StartNewGameOrchestrator,
  type StartNewGameOrchestratorOptions,
} from './new-game/startNewGame.js';

export interface BackendRuntime {
  startGame: (request: StartGameRequest) => Promise<StartGameResult>;
  orchestrator: StartNewGameOrchestrator;
}

export const createBackendRuntime = (
  options: StartNewGameOrchestratorOptions = {}
): BackendRuntime => {
  const orchestrator = createStartNewGameOrchestrator(options);

  return {
	orchestrator,
	startGame: (request: StartGameRequest) => orchestrator.startNewGame(request),
  };
};

console.log('Backend bundle loaded');
