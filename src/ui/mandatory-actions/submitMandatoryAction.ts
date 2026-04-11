import {
  FrontendCommandIntent,
  LocalPlayerClientContract,
} from '../../client/local-player/types';

export const submitMandatoryAction = (
  localPlayer: LocalPlayerClientContract,
  intent: FrontendCommandIntent
) => localPlayer.submitIntent(intent);
