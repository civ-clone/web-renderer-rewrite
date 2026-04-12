import {
  bootstrapParticipants,
  type ParticipantBootstrapResult,
} from './bootstrapParticipants.js';
import { classifyStartupFailure } from './classifyStartupFailure.js';
import {
  createAlreadyStartedResult,
  createFailedResult,
  createStartedResult,
  type ParticipantSummary,
  type SessionStateView,
  type StartGameRequest,
  type StartGameResult,
} from './contracts.js';
import {
  createDefaultInitializationProfile,
  initializeProfile,
  type InitializationModule,
  type InitializationProfile,
} from './initializationProfile.js';
import {
  canAcceptStartRequest,
  createIdleSessionState,
  transitionToActive,
  transitionToFailed,
  transitionToStarting,
} from './sessionState.js';

export interface RuntimeRegistries {
  participants: string[];
  players: string[];
  clients: string[];
}

export interface StartNewGameOrchestratorOptions {
  now?: () => number;
  createSessionId?: () => string;
  initializationProfile?: InitializationProfile;
  initializationModules?: InitializationModule[];
  bootstrapParticipants?: (sessionId: string) => ParticipantBootstrapResult;
  bindRegistries?: (
	result: ParticipantBootstrapResult,
	registries: RuntimeRegistries
  ) => void;
}

export interface StartNewGameOrchestrator {
  startNewGame: (request: StartGameRequest) => Promise<StartGameResult>;
  sessionState: () => SessionStateView;
  participantSummary: () => ParticipantSummary | undefined;
  registries: RuntimeRegistries;
}

const defaultBindRegistries = (
  result: ParticipantBootstrapResult,
  registries: RuntimeRegistries
): void => {
  result.participants.forEach((participant) => {
	registries.participants.push(participant.participantId);
	registries.players.push(participant.playerId);
  });
  result.bindings.forEach((binding) => {
	registries.clients.push(`${binding.playerId}:${binding.clientType}`);
  });
};

export const createStartNewGameOrchestrator = (
  options: StartNewGameOrchestratorOptions = {}
): StartNewGameOrchestrator => {
  const now = options.now ?? (() => Date.now());
  const createSessionId =
	options.createSessionId ?? (() => `session-${now().toString(36)}`);
  const profile =
	options.initializationProfile ?? createDefaultInitializationProfile();
  const initializationModules =
	options.initializationModules ??
	profile.modules.map((name) => ({
	  name,
	  initialize: () => undefined,
	}));
  const participantBootstrap = options.bootstrapParticipants ?? bootstrapParticipants;
  const bindRegistries = options.bindRegistries ?? defaultBindRegistries;

  const registries: RuntimeRegistries = {
	participants: [],
	players: [],
	clients: [],
  };

  let state = createIdleSessionState();
  let summary: ParticipantSummary | undefined;

  return {
	registries,
	sessionState: () => state,
	participantSummary: () => summary,
	startNewGame: async (request: StartGameRequest): Promise<StartGameResult> => {
	  if (!canAcceptStartRequest(state)) {
		return createAlreadyStartedResult(request.requestId, state.sessionId, summary);
	  }

	  const sessionId = createSessionId();
	  state = transitionToStarting(sessionId);

	  try {
		await initializeProfile(profile, initializationModules, now);

		const bootstrapResult = participantBootstrap(sessionId);

		if (bootstrapResult.participants.length !== 3) {
		  throw new Error('participant_create: expected exactly 3 participants');
		}

		bindRegistries(bootstrapResult, registries);

		if (
		  registries.participants.length !== 3 ||
		  registries.players.length !== 3 ||
		  registries.clients.length !== 3
		) {
		  throw new Error('registry_bind: participant registrations incomplete');
		}

		summary = bootstrapResult.summary;
		state = transitionToActive(sessionId, now());

		return createStartedResult(request.requestId, sessionId, summary.allRegistered);
	  } catch (error) {
		const failure = classifyStartupFailure(error, now());
		state = transitionToFailed(sessionId, failure);

		return createFailedResult(request.requestId, failure);
	  }
	},
  };
};

