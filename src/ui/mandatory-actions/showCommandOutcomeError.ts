import { CommandOutcome } from '../../client/local-player/types';

export const showCommandOutcomeError = (
  outcome: CommandOutcome
): string | null => {
  if (outcome.status === 'success') {
    return null;
  }

  return `${outcome.status}: ${outcome.message}`;
};
