export type GameOverActionId = 'restart' | 'mainMenu';
export type SceneKey = 'GameScene' | 'MenuScene';

export interface GameOverAction {
  id: GameOverActionId;
  label: string;
  scene: SceneKey;
}

export const GAME_OVER_ACTIONS: readonly GameOverAction[] = [
  { id: 'restart', label: 'RESTART', scene: 'GameScene' },
  { id: 'mainMenu', label: 'MAIN MENU', scene: 'MenuScene' },
] as const;

export function sceneForGameOverAction(id: GameOverActionId): SceneKey {
  return GAME_OVER_ACTIONS.find((action) => action.id === id)?.scene ?? 'MenuScene';
}
