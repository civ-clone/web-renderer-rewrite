interface FrontendCommandIntent {
  intentId: string;
  type: string;
  actionId: string;
  payload: Record<string, unknown>;
  submittedAt: number;
}

interface SubmittableLocalPlayer {
  submitIntent(intent: FrontendCommandIntent): unknown;
}

export const submitMandatoryAction = (
  localPlayer: SubmittableLocalPlayer,
  intent: FrontendCommandIntent
) => localPlayer.submitIntent(intent);
