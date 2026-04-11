import { MandatoryActionView } from '../../client/local-player/types';

export const renderMandatoryActions = (
  actions: MandatoryActionView[]
): string[] =>
  actions.map((action) =>
    [action.label, action.description].filter(Boolean).join(' | ')
  );
