import { FrontendCommandIntent } from './types';

export interface IntentValidationContext {
  supportedIntentTypes: string[];
  activePlayerId: string;
  expectedPlayerId: string;
  lastKnownTurnToken?: string;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export const validateIntent = (
  intent: FrontendCommandIntent,
  context: IntentValidationContext
): ValidationResult => {
  if (!intent.actionId || !intent.turnToken) {
    return { valid: false, reason: 'Missing required actionId or turnToken.' };
  }

  if (!context.supportedIntentTypes.includes(intent.type)) {
    return { valid: false, reason: `Unsupported intent type: ${intent.type}` };
  }

  if (context.activePlayerId !== context.expectedPlayerId) {
    return {
      valid: false,
      reason: 'Intent is not for the active local player.',
    };
  }

  if (
    context.lastKnownTurnToken &&
    context.lastKnownTurnToken.length > 0 &&
    intent.turnToken !== context.lastKnownTurnToken
  ) {
    return {
      valid: false,
      reason: `Stale turn token: expected ${context.lastKnownTurnToken}, got ${intent.turnToken}`,
    };
  }

  return { valid: true };
};
