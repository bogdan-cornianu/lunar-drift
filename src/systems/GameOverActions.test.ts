import { describe, expect, it } from 'vitest';
import { GAME_OVER_ACTIONS, sceneForGameOverAction } from './GameOverActions';

describe('GameOverActions', () => {
  it('exposes restart and main menu actions in display order', () => {
    expect(GAME_OVER_ACTIONS.map((action) => action.label)).toEqual(['RESTART', 'MAIN MENU']);
  });

  it('routes restart to a new game', () => {
    expect(sceneForGameOverAction('restart')).toBe('GameScene');
  });

  it('routes main menu back to the menu scene', () => {
    expect(sceneForGameOverAction('mainMenu')).toBe('MenuScene');
  });
});
