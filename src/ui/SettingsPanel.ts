import Phaser from 'phaser';
import { difficultyLabel, nextDifficulty } from '../systems/Difficulty';
import {
  GameSettings,
  saveSettings,
  SettingKey,
  updateSetting,
} from '../systems/Settings';

const PANEL_DEPTH = 300;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '16px',
  color: '#e8eef7',
};

interface SettingOption {
  key: Extract<
    SettingKey,
    'screenShake' | 'reducedMotion' | 'exhaustParticles' | 'music' | 'soundEffects'
  >;
  label: string;
}

const OPTIONS: SettingOption[] = [
  { key: 'music', label: 'Menu music' },
  { key: 'soundEffects', label: 'Sound effects' },
  { key: 'screenShake', label: 'Screen shake' },
  { key: 'reducedMotion', label: 'Reduced motion' },
  { key: 'exhaustParticles', label: 'Exhaust particles' },
];

export class SettingsPanel {
  readonly container: Phaser.GameObjects.Container;
  private settings: GameSettings;
  private rows: Phaser.GameObjects.Text[] = [];

  constructor(
    private scene: Phaser.Scene,
    settings: GameSettings,
    onBack: (settings: GameSettings) => void,
    onChange?: (settings: GameSettings) => void,
  ) {
    this.settings = { ...settings };
    this.container = scene.add.container(0, 0).setDepth(PANEL_DEPTH);

    const cx = Number(scene.game.config.width) / 2;
    const cy = Number(scene.game.config.height) / 2;
    this.container.add(scene.add.rectangle(cx, cy, 420, 430, 0x080c14, 0.94));
    this.container.add(scene.add.rectangle(cx, cy, 420, 430).setStrokeStyle(2, 0x6affd9, 0.8));
    this.container.add(
      scene.add
        .text(cx, cy - 178, 'SETTINGS', { ...TEXT_STYLE, fontSize: '28px', color: '#6affd9' })
        .setOrigin(0.5),
    );

    const difficultyRow = this.makeButton(cx, cy - 122, this.difficultyText(), () => {
      this.settings = updateSetting(
        this.settings,
        'difficulty',
        nextDifficulty(this.settings.difficulty),
      );
      saveSettings(this.settings);
      this.renderRows();
      onChange?.(this.settings);
    });
    this.rows.push(difficultyRow);
    this.container.add(difficultyRow);

    OPTIONS.forEach((option, index) => {
      const row = this.makeButton(cx, cy - 74 + index * 42, this.rowText(option), () => {
        this.settings = updateSetting(this.settings, option.key, !this.settings[option.key]);
        saveSettings(this.settings);
        this.renderRows();
        onChange?.(this.settings);
      });
      this.rows.push(row);
      this.container.add(row);
    });

    this.container.add(this.makeButton(cx, cy + 164, 'BACK', () => onBack(this.settings)));
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private renderRows(): void {
    this.rows[0].setText(this.difficultyText());
    OPTIONS.forEach((option, index) => {
      this.rows[index + 1].setText(this.rowText(option));
    });
  }

  private difficultyText(): string {
    return `Difficulty: ${difficultyLabel(this.settings.difficulty)}`;
  }

  private rowText(option: SettingOption): string {
    return `${option.label}: ${this.settings[option.key] ? 'ON' : 'OFF'}`;
  }

  private makeButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.scene.add
      .text(x, y, text, TEXT_STYLE)
      .setOrigin(0.5)
      .setPadding(18, 8, 18, 8)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setColor('#6affd9'));
    button.on('pointerout', () => button.setColor('#e8eef7'));
    button.on('pointerdown', onClick);
    return button;
  }
}
