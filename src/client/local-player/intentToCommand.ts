import { BackendCommandRequest, FrontendCommandIntent } from './types';

export const deterministicRequestId = (
  intent: FrontendCommandIntent,
  playerId: string
): string => {
  const payload = JSON.stringify(
    intent.payload,
    Object.keys(intent.payload).sort()
  );

  return [
    playerId,
    intent.type,
    intent.actionId,
    intent.turnToken,
    payload,
    String(intent.submittedAt),
    intent.intentId,
  ].join(':');
};

export const intentToCommand = (
  intent: FrontendCommandIntent,
  playerId: string
): BackendCommandRequest => ({
  commandType: intent.type,
  playerId,
  turnToken: intent.turnToken,
  commandPayload: intent.payload,
  requestId: deterministicRequestId(intent, playerId),
});
