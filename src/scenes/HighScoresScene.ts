import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { clearHighScores, loadHighScores } from '../systems/HighScores';

interface HighScoresData {
  returnScene?: 'MenuScene' | 'GameOverScene';
  score?: number;
}

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '18px',
  color: '#e8eef7',
};

export class HighScoresScene extends Phaser.Scene {
  private returnScene: 'MenuScene' | 'GameOverScene' = 'MenuScene';
  private finalScore = 0;
  private confirmingClear = false;
  private clearButton!: Phaser.GameObjects.Text;
  private clearHint!: Phaser.GameObjects.Text;
  private scoreRows: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('HighScoresScene');
  }

  create(data: HighScoresData): void {
    this.returnScene = data.returnScene ?? 'MenuScene';
    this.finalScore = Math.max(0, Math.floor(data.score ?? 0));
    this.confirmingClear = false;
    this.cameras.main.setBackgroundColor('#05070d');
    this.spawnStars();

    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, 78, 'HIGH SCORES', {
        ...TEXT_STYLE,
        fontSize: '40px',
        color: '#6affd9',
      })
      .setOrigin(0.5);

    this.renderScores();
    this.addButton(cx - 160, 540, 'BACK', () => this.goBack());
    this.addButton(cx, 540, 'NEW GAME', () => this.scene.start('GameScene'));
    this.clearButton = this.addButton(cx + 170, 540, 'CLEAR SCORES', () => this.confirmClear());
    this.clearHint = this.add
      .text(cx, 578, '', {
        ...TEXT_STYLE,
        fontSize: '12px',
        color: '#ff5677',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ESC', () => this.goBack());
  }

  private renderScores(): void {
    this.scoreRows.forEach((row) => row.destroy());
    this.scoreRows = [];

    const scores = loadHighScores();
    const cx = GAME_WIDTH / 2;
    if (scores.length === 0) {
      this.scoreRows.push(
        this.add
          .text(cx, 280, 'NO HIGH SCORES YET', {
            ...TEXT_STYLE,
            fontSize: '20px',
            color: '#a9b3c1',
          })
          .setOrigin(0.5),
      );
      return;
    }

    this.addScoreText(120, 142, 'RK', '#a9b3c1').setOrigin(1, 0);
    this.addScoreText(190, 142, 'NAME', '#a9b3c1');
    this.addScoreText(520, 142, 'SCORE', '#a9b3c1').setOrigin(1, 0);
    this.addScoreText(590, 142, 'DATE', '#a9b3c1');

    scores.forEach((score, index) => {
      const y = 174 + index * 30;
      const color = index === 0 ? '#ffd166' : '#e8eef7';
      const date = this.formatDate(score.timestamp);
      this.addScoreText(120, y, String(index + 1), color).setOrigin(1, 0);
      this.addScoreText(190, y, score.name, color);
      this.addScoreText(520, y, String(score.score), color).setOrigin(1, 0);
      this.addScoreText(590, y, date, color);
    });
  }

  private addScoreText(x: number, y: number, text: string, color: string): Phaser.GameObjects.Text {
    const row = this.add.text(x, y, text, {
      ...TEXT_STYLE,
      fontSize: '17px',
      color,
    });
    this.scoreRows.push(row);
    return row;
  }

  private confirmClear(): void {
    if (!this.confirmingClear) {
      this.confirmingClear = true;
      this.clearButton.setText('CONFIRM CLEAR');
      this.clearButton.setColor('#ff5677');
      this.clearHint.setText('CLICK AGAIN TO DELETE LOCAL SCORES');
      return;
    }

    clearHighScores();
    this.confirmingClear = false;
    this.clearButton.setText('CLEAR SCORES');
    this.clearButton.setColor('#e8eef7');
    this.clearHint.setText('');
    this.renderScores();
  }

  private goBack(): void {
    if (this.returnScene === 'GameOverScene') {
      this.scene.start('GameOverScene', { score: this.finalScore });
      return;
    }
    this.scene.start('MenuScene');
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${day}/${year}`;
  }

  private addButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, TEXT_STYLE)
      .setOrigin(0.5)
      .setPadding(16, 8, 16, 8)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setColor('#6affd9'));
    button.on('pointerout', () => {
      button.setColor(button === this.clearButton && this.confirmingClear ? '#ff5677' : '#e8eef7');
    });
    button.on('pointerdown', onClick);
    return button;
  }

  private spawnStars(): void {
    for (let i = 0; i < 60; i++) {
      const star = this.add.image(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT * 0.7,
        'star',
      );
      star.setAlpha(0.25 + Math.random() * 0.45);
      star.setDepth(-10);
    }
  }
}
