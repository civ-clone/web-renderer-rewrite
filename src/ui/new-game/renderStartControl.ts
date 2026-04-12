import type { SessionStateView } from '../../js/new-game/contracts.js';

export interface StartControlModel {
  id: string;
  label: string;
  disabled: boolean;
  click: () => void;
}

export const renderStartControl = (
  state: SessionStateView,
  onStart: () => void
): StartControlModel => ({
  id: 'new-game-start-control',
  label: 'Start New Game',
  disabled: !state.canStart,
  click: () => {
    if (state.canStart) {
      onStart();
    }
  },
});

