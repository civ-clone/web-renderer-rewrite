import Client from '@civ-clone/core-client/Client';
import { ChoiceMeta, DataForChoiceMeta } from '@civ-clone/core-client/ChoiceMeta';
import Choice from '@civ-clone/core-client/Choice';
import Player from '@civ-clone/core-player/Player';

export class LocalPlayer extends Client {
  constructor(player: Player) {
    super(player);
  }

  async chooseFromList<Name extends keyof ChoiceMetaDataMap>(
    meta: ChoiceMeta<Name>
  ): Promise<DataForChoiceMeta<ChoiceMeta<Name>>> {
    const choices = meta.choices();
    const choice = await this.selectFromChoices(choices);

    return choice.value();
  }

  async takeTurn(): Promise<void> {
    // Placeholder implementation. In a real scenario, this would be
    // implemented by subclasses or injected with game-specific behavior.
  }

  private async selectFromChoices<T>(
    choices: Choice<T>[]
  ): Promise<Choice<T>> {
    if (choices.length === 0) {
      throw new Error('No choices available');
    }

    return choices[0];
  }
}
