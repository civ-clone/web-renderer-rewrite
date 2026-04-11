import { BackendMandatoryAction } from './backendRelay';
import { MandatoryActionView } from './types';

export const mapBackendActionToMandatoryActionView = (
  action: BackendMandatoryAction
): MandatoryActionView => ({
  actionId: action.id,
  label: action.label,
  description: action.description,
  intentType: action.type,
  turnToken: action.turnToken,
  metadata: action.metadata,
});
