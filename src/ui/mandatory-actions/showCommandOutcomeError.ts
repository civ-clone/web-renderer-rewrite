interface CommandOutcome {
  status: string;
  message: string;
}

export const showCommandOutcomeError = (
  outcome: CommandOutcome
): string | null => {
  if (outcome.status === 'success') {
    return null;
  }

  return `${outcome.status}: ${outcome.message}`;
};
