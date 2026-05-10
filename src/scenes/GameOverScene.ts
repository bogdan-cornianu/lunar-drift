import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { difficultyLabel, DifficultyLevel } from '../systems/Difficulty';
import { GAME_OVER_ACTIONS, GameOverActionId, sceneForGameOverAction } from '../systems/GameOverActions';

interface GameOverData {
  score: number;
  difficulty?: DifficultyLevel;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: GameOverData): void {
    this.cameras.main.setBackgroundColor('#05070d');
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .text(cx, cy - 80, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ff5677',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 10, `FINAL SCORE  ${data.score ?? 0}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#e8eef7',
      })
      .setOrigin(0.5);

    if (data.difficulty) {
      this.add
        .text(cx, cy + 22, difficultyLabel(data.difficulty).toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#a9b3c1',
        })
        .setOrigin(0.5);
    }

    GAME_OVER_ACTIONS.forEach((action, index) => {
      this.addButton(cx, cy + 64 + index * 46, action.label, () => this.runAction(action.id));
    });

    this.input.keyboard?.once('keydown-R', () => {
      this.runAction('restart');
    });
    this.input.keyboard?.once('keydown-ESC', () => this.runAction('mainMenu'));
  }

  private runAction(id: GameOverActionId): void {
    this.scene.start(sceneForGameOverAction(id));
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#e8eef7',
      })
      .setOrigin(0.5)
      .setPadding(18, 8, 18, 8)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setColor('#6affd9'));
    button.on('pointerout', () => button.setColor('#e8eef7'));
    button.on('pointerdown', onClick);
  }
}
