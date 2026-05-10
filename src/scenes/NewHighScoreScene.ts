import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  DEFAULT_DIFFICULTY,
  difficultyLabel,
  DifficultyLevel,
} from '../systems/Difficulty';
import {
  HIGH_SCORE_NAME_MAX_LENGTH,
  normalizeHighScoreName,
  saveHighScore,
} from '../systems/HighScores';

interface NewHighScoreData {
  score: number;
  difficulty?: DifficultyLevel;
}

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '18px',
  color: '#e8eef7',
};

export class NewHighScoreScene extends Phaser.Scene {
  private score = 0;
  private difficulty: DifficultyLevel = DEFAULT_DIFFICULTY;
  private nameValue = '';
  private nameText!: Phaser.GameObjects.Text;

  constructor() {
    super('NewHighScoreScene');
  }

  create(data: NewHighScoreData): void {
    this.score = Math.max(0, Math.floor(data.score ?? 0));
    this.difficulty = data.difficulty ?? DEFAULT_DIFFICULTY;
    this.nameValue = '';
    this.cameras.main.setBackgroundColor('#05070d');
    this.spawnStars();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .text(cx, cy - 146, 'NEW HIGH SCORE', {
        ...TEXT_STYLE,
        fontSize: '38px',
        color: '#6affd9',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 86, `FINAL SCORE  ${this.score}`, {
        ...TEXT_STYLE,
        fontSize: '22px',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 58, difficultyLabel(this.difficulty).toUpperCase(), {
        ...TEXT_STYLE,
        fontSize: '14px',
        color: '#a9b3c1',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 26, 'ENTER NAME', {
        ...TEXT_STYLE,
        fontSize: '14px',
        color: '#a9b3c1',
      })
      .setOrigin(0.5);

    this.add.rectangle(cx, cy + 18, 240, 48, 0x080c14, 0.95);
    this.add.rectangle(cx, cy + 18, 240, 48).setStrokeStyle(2, 0x6affd9, 0.85);
    this.nameText = this.add
      .text(cx, cy + 17, this.displayName(), {
        ...TEXT_STYLE,
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 62, `MAX ${HIGH_SCORE_NAME_MAX_LENGTH} LETTERS`, {
        ...TEXT_STYLE,
        fontSize: '12px',
        color: '#a9b3c1',
      })
      .setOrigin(0.5);

    this.addButton(cx - 78, cy + 120, 'SAVE', () => this.save());
    this.addButton(cx + 88, cy + 120, 'CANCEL', () => this.cancel());

    this.input.keyboard?.on('keydown', this.handleKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown, this);
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.save();
      return;
    }
    if (event.key === 'Escape') {
      this.cancel();
      return;
    }
    if (event.key === 'Backspace') {
      this.nameValue = this.nameValue.slice(0, -1);
      this.refreshName();
      return;
    }
    if (this.nameValue.length >= HIGH_SCORE_NAME_MAX_LENGTH) return;
    if (/^[a-zA-Z0-9 ]$/.test(event.key)) {
      this.nameValue += event.key.toUpperCase();
      this.refreshName();
    }
  }

  private save(): void {
    saveHighScore({
      name: normalizeHighScoreName(this.nameValue),
      score: this.score,
      timestamp: Date.now(),
    }, this.difficulty);
    this.scene.start('HighScoresScene', {
      returnScene: 'GameOverScene',
      score: this.score,
      difficulty: this.difficulty,
    });
  }

  private cancel(): void {
    this.scene.start('GameOverScene', { score: this.score, difficulty: this.difficulty });
  }

  private refreshName(): void {
    this.nameText.setText(this.displayName());
  }

  private displayName(): string {
    return this.nameValue || '_';
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add
      .text(x, y, label, TEXT_STYLE)
      .setOrigin(0.5)
      .setPadding(18, 8, 18, 8)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setColor('#6affd9'));
    button.on('pointerout', () => button.setColor('#e8eef7'));
    button.on('pointerdown', onClick);
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
