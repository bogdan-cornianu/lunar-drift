import Phaser from 'phaser';
import { GAME_HEIGHT, SAFE_ANGLE_DEG, SAFE_VX, SAFE_VY } from '../config';

const STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#cfd8e6',
};

const SAFE_COLOR = '#6affd9';
const DANGER_COLOR = '#ff5677';

export class Hud {
  private score: Phaser.GameObjects.Text;
  private fuel: Phaser.GameObjects.Text;
  private fuelBar: Phaser.GameObjects.Rectangle;
  private fuelBarBg: Phaser.GameObjects.Rectangle;
  private lives: Phaser.GameObjects.Text;
  private siteText: Phaser.GameObjects.Text;
  private objectiveText: Phaser.GameObjects.Text;
  private streakText: Phaser.GameObjects.Text;
  private vxText: Phaser.GameObjects.Text;
  private vyText: Phaser.GameObjects.Text;
  private angleText: Phaser.GameObjects.Text;
  private altText: Phaser.GameObjects.Text;
  private windText: Phaser.GameObjects.Text;
  private safetyText: Phaser.GameObjects.Text;
  private toast: Phaser.GameObjects.Text;
  private breakdown: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.score = scene.add.text(12, 10, 'SCORE 0', STYLE);
    this.lives = scene.add.text(12, 28, 'LIVES 3', STYLE);
    this.siteText = scene.add.text(12, 46, 'SITE 1', STYLE);
    this.streakText = scene.add.text(12, 64, 'STREAK 0', STYLE);

    this.fuel = scene.add.text(12, 88, 'FUEL', STYLE);
    this.fuelBarBg = scene.add.rectangle(54, 96, 120, 8, 0x2a3140).setOrigin(0, 0.5);
    this.fuelBar = scene.add.rectangle(54, 96, 120, 8, 0x6affd9).setOrigin(0, 0.5);
    this.objectiveText = scene.add.text(12, 112, 'OBJ  LAND SAFELY', STYLE);

    this.altText = scene.add.text(640, 10, 'ALT  0', STYLE);
    this.vxText = scene.add.text(640, 28, 'VX   0', STYLE);
    this.vyText = scene.add.text(640, 46, 'VY   0', STYLE);
    this.angleText = scene.add.text(640, 64, 'ANG  0', STYLE);
    this.windText = scene.add.text(640, 82, 'WIND 0', STYLE);
    this.safetyText = scene.add.text(640, 106, 'SAFE', STYLE);

    this.toast = scene.add
      .text(400, 232, '', { ...STYLE, fontSize: '30px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.breakdown = scene.add
      .text(400, 270, '', { ...STYLE, fontSize: '14px', color: '#cfd8e6' })
      .setOrigin(0.5)
      .setAlpha(0);

    [
      this.score,
      this.lives,
      this.siteText,
      this.streakText,
      this.fuel,
      this.fuelBar,
      this.fuelBarBg,
      this.objectiveText,
      this.altText,
      this.vxText,
      this.vyText,
      this.angleText,
      this.windText,
      this.safetyText,
      this.toast,
      this.breakdown,
    ].forEach((o) => o.setDepth(100));
  }

  update(state: {
    site: number;
    score: number;
    lives: number;
    fuel: number;
    fuelMax: number;
    vx: number;
    vy: number;
    angleDeg: number;
    altitude: number;
    streak: number;
    objective: string;
    windX: number;
  }): void {
    this.score.setText(`SCORE ${state.score}`);
    this.lives.setText(`LIVES ${state.lives}`);
    this.siteText.setText(`SITE ${state.site}`);
    this.streakText.setText(`STREAK ${state.streak}`);
    this.objectiveText.setText(`OBJ  ${state.objective}`);

    const ratio = Phaser.Math.Clamp(state.fuel / state.fuelMax, 0, 1);
    this.fuelBar.width = 120 * ratio;
    this.fuelBar.fillColor = ratio < 0.2 ? 0xff5677 : ratio < 0.4 ? 0xffd166 : 0x6affd9;

    this.altText.setText(`ALT  ${Math.max(0, Math.round(state.altitude)).toString().padStart(3, ' ')}`);

    const absVx = Math.abs(state.vx);
    const absVy = Math.abs(state.vy);
    const absAngle = Math.abs(state.angleDeg);
    this.vxText.setText(`VX  ${state.vx >= 0 ? ' ' : '-'}${Math.round(absVx).toString().padStart(2, '0')}`);
    this.vyText.setText(`VY  ${state.vy >= 0 ? ' ' : '-'}${Math.round(absVy).toString().padStart(2, '0')}`);
    this.angleText.setText(`ANG ${state.angleDeg >= 0 ? ' ' : '-'}${Math.round(absAngle).toString().padStart(2, '0')}`);
    this.windText.setText(`WIND ${state.windX >= 0 ? ' ' : '-'}${Math.round(Math.abs(state.windX)).toString().padStart(2, '0')}`);
    this.vxText.setColor(absVx > SAFE_VX ? DANGER_COLOR : SAFE_COLOR);
    this.vyText.setColor(absVy > SAFE_VY ? DANGER_COLOR : SAFE_COLOR);
    this.angleText.setColor(absAngle > SAFE_ANGLE_DEG ? DANGER_COLOR : SAFE_COLOR);
    this.safetyText.setText(this.safetyLabel(absVx, absVy, absAngle));
    this.safetyText.setColor(this.safetyText.text === 'SAFE' ? SAFE_COLOR : DANGER_COLOR);
  }

  showToast(scene: Phaser.Scene, text: string, color: string): void {
    this.toast.setText(text);
    this.toast.setColor(color);
    this.toast.setAlpha(1);
    scene.tweens.add({
      targets: this.toast,
      alpha: 0,
      duration: 1400,
      ease: 'Quad.easeIn',
    });
  }

  showBreakdown(scene: Phaser.Scene, text: string): void {
    this.breakdown.setText(text);
    this.breakdown.setAlpha(1);
    scene.tweens.add({
      targets: this.breakdown,
      alpha: 0,
      duration: 1600,
      ease: 'Quad.easeIn',
    });
  }

  static computeAltitude(landerY: number, groundY: number): number {
    return Math.max(0, groundY - landerY);
  }

  static groundReference(): number {
    return GAME_HEIGHT;
  }

  private safetyLabel(absVx: number, absVy: number, absAngle: number): string {
    if (absAngle > SAFE_ANGLE_DEG) return 'TILTED';
    if (absVx > SAFE_VX || absVy > SAFE_VY) return 'FAST';
    return 'SAFE';
  }
}
