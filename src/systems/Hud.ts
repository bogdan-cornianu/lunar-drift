import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config';
import {
  LandingCue,
  LandingCueLevel,
  LandingCueMetric,
} from './HudState';

const STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#cfd8e6',
};

const SMALL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  ...STYLE,
  fontSize: '11px',
  color: '#8090a8',
};

const STATUS_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  ...STYLE,
  fontSize: '20px',
  color: '#6affd9',
};

const SAFE_COLOR = '#6affd9';
const WARNING_COLOR = '#ffd166';
const DANGER_COLOR = '#ff5677';
const SAFE_COLOR_NUMBER = 0x6affd9;
const WARNING_COLOR_NUMBER = 0xffd166;
const DANGER_COLOR_NUMBER = 0xff5677;
const MUTED_COLOR = '#8090a8';
const ALTITUDE_PROMINENT = 130;

export class Hud {
  private metaText: Phaser.GameObjects.Text;
  private fuel: Phaser.GameObjects.Text;
  private fuelBar: Phaser.GameObjects.Rectangle;
  private fuelBarBg: Phaser.GameObjects.Rectangle;
  private fuelTarget: Phaser.GameObjects.Rectangle;
  private objectiveText: Phaser.GameObjects.Text;
  private landingText: Phaser.GameObjects.Text;
  private vxText: Phaser.GameObjects.Text;
  private vyText: Phaser.GameObjects.Text;
  private angleText: Phaser.GameObjects.Text;
  private altText: Phaser.GameObjects.Text;
  private windText: Phaser.GameObjects.Text;
  private toast: Phaser.GameObjects.Text;
  private breakdown: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.metaText = scene.add.text(12, 10, 'SITE 1   LIVES 3   SCORE 0', SMALL_STYLE);

    this.fuel = scene.add.text(12, 31, 'FUEL', STYLE);
    this.fuelBarBg = scene.add.rectangle(54, 39, 140, 9, 0x2a3140).setOrigin(0, 0.5);
    this.fuelBar = scene.add.rectangle(54, 39, 140, 9, SAFE_COLOR_NUMBER).setOrigin(0, 0.5);
    this.fuelTarget = scene.add.rectangle(54, 39, 2, 15, 0xffffff).setOrigin(0.5);
    this.objectiveText = scene.add.text(12, 58, 'OBJ  LAND SAFELY', STYLE);

    this.landingText = scene.add.text(640, 10, 'SAFE', STATUS_STYLE);
    this.vxText = scene.add.text(640, 36, 'VX   0', SMALL_STYLE);
    this.vyText = scene.add.text(640, 52, 'VY   0', SMALL_STYLE);
    this.angleText = scene.add.text(640, 68, 'ANG  0', SMALL_STYLE);
    this.altText = scene.add.text(640, 88, 'ALT  0', STYLE);
    this.windText = scene.add.text(640, 112, '', SMALL_STYLE);

    this.toast = scene.add
      .text(400, 232, '', { ...STYLE, fontSize: '30px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.breakdown = scene.add
      .text(400, 270, '', { ...STYLE, fontSize: '14px', color: '#cfd8e6' })
      .setOrigin(0.5)
      .setAlpha(0);

    [
      this.metaText,
      this.fuel,
      this.fuelBarBg,
      this.fuelBar,
      this.fuelTarget,
      this.objectiveText,
      this.landingText,
      this.altText,
      this.vxText,
      this.vyText,
      this.angleText,
      this.windText,
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
    targetFuel: number | null;
    windX: number;
    landingCue: LandingCue;
  }): void {
    this.metaText.setText(
      `SITE ${state.site}   LIVES ${state.lives}   STREAK ${state.streak}   SCORE ${state.score}`,
    );
    this.objectiveText.setText(`OBJ  ${state.objective}`);

    const ratio = Phaser.Math.Clamp(state.fuel / state.fuelMax, 0, 1);
    this.fuelBar.width = 140 * ratio;
    this.fuelBar.fillColor = this.fuelColor(ratio);
    this.fuelTarget.setVisible(state.targetFuel !== null);
    if (state.targetFuel !== null) {
      const targetRatio = Phaser.Math.Clamp(state.targetFuel / state.fuelMax, 0, 1);
      this.fuelTarget.x = 54 + 140 * targetRatio;
      this.fuelTarget.fillColor = ratio >= targetRatio ? SAFE_COLOR_NUMBER : WARNING_COLOR_NUMBER;
    }

    this.altText.setText(`ALT  ${Math.max(0, Math.round(state.altitude)).toString().padStart(3, ' ')}`);
    this.altText.setVisible(state.altitude <= ALTITUDE_PROMINENT);
    this.altText.setColor(state.altitude < 55 ? WARNING_COLOR : SAFE_COLOR);

    const absVx = Math.abs(state.vx);
    const absVy = Math.abs(state.vy);
    const absAngle = Math.abs(state.angleDeg);
    this.vxText.setText(`VX  ${state.vx >= 0 ? ' ' : '-'}${Math.round(absVx).toString().padStart(2, '0')}`);
    this.vyText.setText(`VY  ${state.vy >= 0 ? ' ' : '-'}${Math.round(absVy).toString().padStart(2, '0')}`);
    this.angleText.setText(`ANG ${state.angleDeg >= 0 ? ' ' : '-'}${Math.round(absAngle).toString().padStart(2, '0')}`);
    this.vxText.setColor(this.textColorForMetric(state.landingCue.lateral));
    this.vyText.setColor(this.textColorForMetric(state.landingCue.descent));
    this.angleText.setColor(this.textColorForMetric(state.landingCue.tilt));

    this.landingText.setText(state.landingCue.label);
    this.landingText.setColor(this.textColorForLevel(state.landingCue.level));

    this.windText.setVisible(state.windX !== 0);
    this.windText.setText(
      `${state.windX > 0 ? 'WIND >' : 'WIND <'} ${Math.round(Math.abs(state.windX)).toString().padStart(2, '0')}`,
    );
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

  private fuelColor(ratio: number): number {
    if (ratio < 0.2) return DANGER_COLOR_NUMBER;
    if (ratio < 0.4) return WARNING_COLOR_NUMBER;
    return SAFE_COLOR_NUMBER;
  }

  private textColorForMetric(metric: LandingCueMetric): string {
    if (metric.level === 'unsafe') return DANGER_COLOR;
    if (metric.level === 'warning') return WARNING_COLOR;
    return MUTED_COLOR;
  }

  private textColorForLevel(level: LandingCueLevel): string {
    if (level === 'unsafe') return DANGER_COLOR;
    if (level === 'warning') return WARNING_COLOR;
    return SAFE_COLOR;
  }
}
