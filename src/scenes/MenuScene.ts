import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getGameAudio, preferencesFromSettings } from '../systems/GameAudio';
import {
  controlHintForScheme,
  createInputDeviceSnapshot,
  detectInputScheme,
} from '../systems/InputMode';
import { loadSettings } from '../systems/Settings';
import { SettingsPanel } from '../ui/SettingsPanel';

const MENU_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '18px',
  color: '#e8eef7',
};

export class MenuScene extends Phaser.Scene {
  private settingsPanel: SettingsPanel | null = null;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private audio = getGameAudio();

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.audio.setPreferences(preferencesFromSettings(loadSettings()));
    this.audio.enterMenu();
    this.input.once('pointerdown', () => this.audio.unlock());
    this.input.keyboard?.once('keydown', () => this.audio.unlock());
    this.cameras.main.setBackgroundColor('#05070d');
    this.spawnStars();
    this.showMainMenu();
  }

  private showMainMenu(): void {
    this.clearSettings();
    this.menuItems.forEach((item) => item.destroy());
    this.menuItems = [];

    const cx = GAME_WIDTH / 2;
    const title = this.add
      .text(cx, 150, 'LUNAR DRIFT', {
        ...MENU_STYLE,
        fontSize: '46px',
        color: '#6affd9',
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(cx, 198, 'ENDLESS DESCENT', {
        ...MENU_STYLE,
        fontSize: '14px',
        color: '#a9b3c1',
      })
      .setOrigin(0.5);
    const inputScheme = detectInputScheme(createInputDeviceSnapshot(this.sys.game.device));
    const controlsHint = this.add
      .text(cx, 230, controlHintForScheme(inputScheme), {
        ...MENU_STYLE,
        fontSize: '12px',
        color: '#8090a8',
      })
      .setOrigin(0.5);

    this.menuItems.push(
      title,
      subtitle,
      controlsHint,
      this.makeButton(cx, 290, 'NEW GAME', () => this.scene.start('GameScene')),
      this.makeButton(cx, 340, 'HIGH SCORES', () =>
        this.scene.start('HighScoresScene'),
      ),
      this.makeButton(cx, 390, 'SETTINGS', () => this.showSettings()),
    );
  }

  private showSettings(): void {
    this.menuItems.forEach((item) => item.setVisible(false));
    this.settingsPanel = new SettingsPanel(
      this,
      loadSettings(),
      (settings) => {
        this.audio.setPreferences(preferencesFromSettings(settings));
        this.clearSettings();
        this.menuItems.forEach((item) => item.setVisible(true));
      },
      (settings) => this.audio.setPreferences(preferencesFromSettings(settings)),
    );
  }

  private clearSettings(): void {
    this.settingsPanel?.destroy();
    this.settingsPanel = null;
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, MENU_STYLE)
      .setOrigin(0.5)
      .setPadding(20, 8, 20, 8)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setColor('#6affd9'));
    button.on('pointerout', () => button.setColor('#e8eef7'));
    button.on('pointerdown', () => {
      this.audio.unlock();
      this.audio.playUiSelect();
      onClick();
    });
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
