import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
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

  constructor() {
    super('MenuScene');
  }

  create(): void {
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
      .text(cx, 198, 'ENDLESS DESCENT RUN', {
        ...MENU_STYLE,
        fontSize: '14px',
        color: '#a9b3c1',
      })
      .setOrigin(0.5);

    this.menuItems.push(
      title,
      subtitle,
      this.makeButton(cx, 290, 'NEW GAME', () => this.scene.start('GameScene')),
      this.makeButton(cx, 340, 'SETTINGS', () => this.showSettings()),
    );
  }

  private showSettings(): void {
    this.menuItems.forEach((item) => item.setVisible(false));
    this.settingsPanel = new SettingsPanel(this, loadSettings(), () => {
      this.clearSettings();
      this.menuItems.forEach((item) => item.setVisible(true));
    });
  }

  private clearSettings(): void {
    this.settingsPanel?.destroy();
    this.settingsPanel = null;
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, MENU_STYLE)
      .setOrigin(0.5)
      .setPadding(20, 8, 20, 8)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setColor('#6affd9'));
    button.on('pointerout', () => button.setColor('#e8eef7'));
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
