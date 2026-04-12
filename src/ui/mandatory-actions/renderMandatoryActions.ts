import type { MandatoryActionView } from '../../client/local-player/types';

interface RenderMandatoryActionsOptions {
  sessionStatus: 'idle' | 'starting' | 'active' | 'failed';
}

export const renderMandatoryActions = (
  actions: MandatoryActionView[],
  options: RenderMandatoryActionsOptions = {
    sessionStatus: 'active',
  }
): string[] => {
  if (options.sessionStatus !== 'active' || !actions.length) {
    return [];
  }

  return actions.map((action) =>
    [action.label, action.description].filter(Boolean).join(' | ')
  );
};
