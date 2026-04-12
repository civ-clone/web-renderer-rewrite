import type { StartupFailure } from '../../js/new-game/contracts.js';

export const showStartupFailure = (failure: StartupFailure): string =>
  `Startup failed (${failure.code}): ${failure.message}`;

