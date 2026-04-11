export type FrontendIntentType = string;

export interface MandatoryActionView {
  actionId: string;
  label: string;
  description?: string;
  intentType: FrontendIntentType;
  metadata?: Record<string, unknown>;
}
