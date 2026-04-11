import CivClient from '@civ-clone/core-civ-client/Client';
import { ChoiceMeta, DataForChoiceMeta } from '@civ-clone/core-client/ChoiceMeta';
import Choice from '@civ-clone/core-client/Choice';
import LeaderRegistry, {
  instance as leaderRegistryInstance,
} from '@civ-clone/core-civilization/LeaderRegistry';
import Player from '@civ-clone/core-player/Player';

export class LocalPlayer extends CivClient {
  constructor(
    player: Player,
    leaderRegistry: LeaderRegistry = leaderRegistryInstance,
    randomNumberGenerator?: () => number
  ) {
    super(player, leaderRegistry, randomNumberGenerator);
  }

  async chooseFromList<Name extends keyof ChoiceMetaDataMap>(
    meta: ChoiceMeta<Name>
  ): Promise<DataForChoiceMeta<ChoiceMeta<Name>>> {
    const choices = meta.choices();
    const choice = await this.selectFromChoices(choices);

    return choice.value();
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
