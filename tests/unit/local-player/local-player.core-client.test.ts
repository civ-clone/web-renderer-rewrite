import { describe, expect, it } from 'vitest';
import Civilization from '@civ-clone/core-civilization/Civilization';
import Leader from '@civ-clone/core-civilization/Leader';
import LeaderRegistry from '@civ-clone/core-civilization/LeaderRegistry';
import Player from '@civ-clone/core-player/Player';
import { LocalPlayer } from '../../../src/client/local-player/LocalPlayer';
import { InProcessTransport } from '../../helpers/transportFixtures';

class TestCivilization extends Civilization {}

class TestLeader extends Leader {
  static civilization(): typeof Civilization {
    return TestCivilization;
  }
}

describe('LocalPlayer core client behavior', () => {
  it('chooses a civilization and assigns a matching leader', () => {
    const leaderRegistry = new LeaderRegistry();

    leaderRegistry.register(TestLeader);

    const player = new Player();
    const localPlayer = new LocalPlayer(
      player,
      leaderRegistry,
      new InProcessTransport()
    );

    localPlayer.chooseCivilization([TestCivilization]);

    expect(player.civilization()).toBeInstanceOf(TestCivilization);
    expect(player.civilization().leader()).toBeInstanceOf(TestLeader);
  });
});


