import { CommandOutcome } from './types';

export const normalizeCommandOutcome = (
  value: Partial<CommandOutcome>,
  fallbackRequestId: string
): CommandOutcome => ({
  status: value.status ?? 'transport_error',
  message: value.message ?? 'Unable to complete command submission.',
  requestId: value.requestId ?? fallbackRequestId,
  updatedMandatoryActions: value.updatedMandatoryActions ?? [],
  recoverable: value.recoverable ?? true,
});
