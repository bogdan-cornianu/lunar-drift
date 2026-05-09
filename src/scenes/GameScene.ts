import Phaser from 'phaser';
import {
  FUEL_MAX,
  GAME_HEIGHT,
  GAME_WIDTH,
  SAFE_ANGLE_DEG,
  SAFE_VX,
  SAFE_VY,
  STARTING_LIVES,
} from '../config';
import { Lander } from '../entities/Lander';
import { Terrain, PadInfo } from '../entities/Terrain';
import { Controls } from '../systems/Controls';
import { Hud } from '../systems/Hud';
import {
  createPauseState,
  PauseState,
  pauseState,
  resetPauseState,
  resumeState,
} from '../systems/PauseState';
import { RunProgression } from '../systems/RunProgression';
import { computeLandingScore } from '../systems/Scoring';
import { GameSettings, loadSettings } from '../systems/Settings';
import { SettingsPanel } from '../ui/SettingsPanel';

type GameState = 'flying' | 'resolving' | 'gameover';

export class GameScene extends Phaser.Scene {
  controls!: Controls;
  private lander!: Lander;
  private terrain!: Terrain;
  private hud!: Hud;
  private progression = new RunProgression();

  private score = 0;
  private lives = STARTING_LIVES;
  private state: GameState = 'flying';
  private currentSeed = 0;
  private nextFuel = FUEL_MAX;
  private settings: GameSettings = loadSettings();
  private pauseState: PauseState = createPauseState();
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private settingsPanel: SettingsPanel | null = null;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor('#05070d');

    this.spawnStars();

    this.controls = new Controls(this);
    this.terrain = new Terrain(this);
    this.progression = new RunProgression();
    this.pauseState = resetPauseState();
    this.clearPauseUi();
    this.physics.world.resume();
    this.currentSeed = this.makeSeed();
    this.progression.prepareSite(this.currentSeed);
    this.terrain.regenerate(this.currentSeed, this.progression.getDifficulty());

    this.lander = new Lander(this, GAME_WIDTH / 2, 60);
    this.lander.setWind(this.progression.getDifficulty().windX);
    this.settings = loadSettings();
    this.applySettings();

    this.hud = new Hud(this);
    this.input.keyboard?.off('keydown-ESC');
    this.input.keyboard?.on('keydown-ESC', () => this.handleEscape());

    this.score = 0;
    this.lives = STARTING_LIVES;
    this.nextFuel = FUEL_MAX;
    this.state = 'flying';
  }

  override update(time: number, delta: number): void {
    if (this.pauseState.paused) return;

    this.lander.update(time, delta);

    if (this.state === 'flying') {
      this.checkTerrainContact();
    }

    if (this.state === 'flying') {
      const body = this.lander.body as Phaser.Physics.Arcade.Body;
      this.hud.update({
        site: this.progression.site,
        score: this.score,
        lives: this.lives,
        fuel: this.lander.fuel,
        fuelMax: FUEL_MAX,
        vx: body.velocity.x,
        vy: body.velocity.y,
        angleDeg: this.normalizedAngleDeg(),
        altitude: this.estimateAltitude(),
        streak: this.progression.streak,
        objective: this.progression.objective.label,
        windX: this.progression.getDifficulty().windX,
      });
    }
  }

  private estimateAltitude(): number {
    const landingGearY = Math.max(...this.lander.getLandingGearPoints().map((p) => p.y));
    const groundY = this.terrain.surfaceYAt(this.lander.x);
    return Hud.computeAltitude(landingGearY, groundY);
  }

  private checkTerrainContact(): void {
    const probe = this.lander.getCollisionProbePoints();
    const hasContact = probe.some((p) => p.y >= this.terrain.surfaceYAt(p.x));
    if (!hasContact) return;

    this.onTerrainHit(this.findTouchedPad());
  }

  private findTouchedPad(): PadInfo | null {
    const feet = this.lander.getLandingGearPoints();
    const leftPad = this.terrain.findPadAt(feet[0].x);
    const rightPad = this.terrain.findPadAt(feet[1].x);
    if (!leftPad || leftPad !== rightPad) return null;

    const leftOnPad = feet[0].y >= this.terrain.padSurfaceY(leftPad);
    const rightOnPad = feet[1].y >= this.terrain.padSurfaceY(rightPad);
    return leftOnPad || rightOnPad ? leftPad : null;
  }

  private onTerrainHit(pad: PadInfo | null): void {
    if (this.state !== 'flying') return;
    this.state = 'resolving';

    const body = this.lander.body as Phaser.Physics.Arcade.Body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const angleDeg = this.normalizedAngleDeg();
    const upright = Math.abs(angleDeg) <= SAFE_ANGLE_DEG;
    const slow = Math.abs(vx) <= SAFE_VX && Math.abs(vy) <= SAFE_VY;

    if (pad && upright && slow) {
      this.snapLanderToTerrain();
      this.lander.settle();
      const provisional = computeLandingScore({
        multiplier: pad.multiplier,
        fuelRemaining: this.lander.fuel,
        vx,
        vy,
        angleDeg,
        streak: this.progression.streak,
        objectiveMet: false,
      });
      const outcome = this.progression.resolveLanding({
        grade: provisional.grade,
        fuelRemaining: this.lander.fuel,
        multiplier: pad.multiplier,
        vy,
      });
      const scoreResult = computeLandingScore({
        multiplier: pad.multiplier,
        fuelRemaining: this.lander.fuel,
        vx,
        vy,
        angleDeg,
        streak: this.progression.streak - 1,
        objectiveMet: outcome.objectiveMet,
      });
      const gained = scoreResult.total;
      this.score += gained;
      this.nextFuel = outcome.nextFuel;
      this.hud.showToast(
        this,
        `${scoreResult.grade}  +${gained}${outcome.objectiveMet ? '  OBJECTIVE' : ''}`,
        '#6affd9',
      );
      this.hud.showBreakdown(
        this,
        `BASE ${scoreResult.base}  FUEL ${scoreResult.fuelBonus}  STREAK ${scoreResult.streakBonus}`,
      );
      if (!this.settings.reducedMotion) this.cameras.main.flash(300, 40, 100, 70);
      this.time.delayedCall(1300, () => this.respawn(true));
    } else {
      this.lives -= 1;
      this.progression.resetStreak();
      this.hud.showToast(this, this.lives > 0 ? 'CRASHED' : 'GAME OVER', '#ff5677');
      this.hud.showBreakdown(this, this.crashReason(Boolean(pad), upright, slow));
      if (this.settings.screenShake && !this.settings.reducedMotion) {
        this.cameras.main.shake(280, 0.012);
      }
      this.playCrashExplosion(this.lander.x, this.lander.y);
      this.lander.kill();
      this.time.delayedCall(1100, () => {
        if (this.lives > 0) this.respawn(false);
        else this.endGame();
      });
    }
  }

  private snapLanderToTerrain(): void {
    const penetration = Math.max(
      ...this.lander.getCollisionProbePoints().map((p) => p.y - this.terrain.surfaceYAt(p.x)),
    );
    if (penetration > 0) this.lander.y -= penetration;
  }

  private respawn(advance: boolean): void {
    if (advance) {
      this.progression.advanceSite();
      this.currentSeed = this.makeSeed();
      this.progression.prepareSite(this.currentSeed);
    } else {
      this.nextFuel = FUEL_MAX;
    }
    const difficulty = this.progression.getDifficulty();
    this.terrain.regenerate(this.currentSeed, difficulty);
    this.lander.setWind(difficulty.windX);
    this.lander.reset(GAME_WIDTH / 2, 60, this.nextFuel);
    this.applySettings();
    this.state = 'flying';
  }

  private endGame(): void {
    this.state = 'gameover';
    this.scene.start('GameOverScene', { score: this.score });
  }

  private makeSeed(): number {
    return Math.floor(Math.random() * 2 ** 31);
  }

  private normalizedAngleDeg(): number {
    return Phaser.Math.Angle.WrapDegrees(Phaser.Math.RadToDeg(this.lander.rotation));
  }

  private crashReason(onPad: boolean, upright: boolean, slow: boolean): string {
    if (!onPad) return 'MISSED LANDING PAD';
    if (!upright) return 'TOUCHDOWN ANGLE TOO HIGH';
    if (!slow) return 'TOUCHDOWN SPEED TOO HIGH';
    return 'UNSAFE TOUCHDOWN';
  }

  private playCrashExplosion(x: number, y: number): void {
    const core = this.add.circle(x, y, 10, 0xffd166, 0.92);
    core.setBlendMode(Phaser.BlendModes.ADD);
    core.setDepth(40);

    const ring = this.add.circle(x, y, 16);
    ring.setStrokeStyle(3, 0xff8c42, 0.95);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.setDepth(39);

    if (this.settings.reducedMotion) {
      this.tweens.add({
        targets: [core, ring],
        alpha: 0,
        scale: 1.35,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => {
          core.destroy();
          ring.destroy();
        },
      });
      return;
    }

    this.tweens.add({
      targets: core,
      alpha: 0,
      scale: 2.4,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => core.destroy(),
    });
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 3.2,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    const tints = [0xff5677, 0xff8c42, 0xffd166, 0xffffff];
    for (let i = 0; i < 34; i++) {
      const particle = this.add.image(x, y, 'particle');
      const angle = Math.random() * Math.PI * 2;
      const distance = 28 + Math.random() * 54;
      const duration = 360 + Math.random() * 260;
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setDepth(38);
      particle.setScale(1.4 + Math.random() * 1.7);
      particle.setTint(tints[Math.floor(Math.random() * tints.length)]);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private handleEscape(): void {
    if (this.state !== 'flying') return;
    if (this.settingsPanel) {
      this.closePauseSettings();
      return;
    }
    if (this.pauseState.paused) this.resumeGame();
    else this.pauseGame();
  }

  private pauseGame(): void {
    if (this.pauseState.paused) return;
    this.pauseState = pauseState(this.pauseState);
    this.physics.world.pause();
    this.showPauseOverlay();
  }

  private resumeGame(): void {
    this.clearPauseUi();
    this.physics.world.resume();
    this.pauseState = resumeState(this.pauseState);
  }

  private showPauseOverlay(): void {
    this.clearPauseUi();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const overlay = this.add.container(0, 0).setDepth(250);
    overlay.add(this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.72));
    overlay.add(this.add.rectangle(cx, cy, 360, 280, 0x080c14, 0.94));
    overlay.add(this.add.rectangle(cx, cy, 360, 280).setStrokeStyle(2, 0x6affd9, 0.8));
    overlay.add(
      this.add
        .text(cx, cy - 104, 'PAUSED', {
          fontFamily: 'monospace',
          fontSize: '34px',
          color: '#6affd9',
        })
        .setOrigin(0.5),
    );
    overlay.add(this.makePauseButton(cx, cy - 36, 'RESUME', () => this.resumeGame()));
    overlay.add(this.makePauseButton(cx, cy + 14, 'MAIN MENU', () => this.returnToMainMenu()));
    overlay.add(this.makePauseButton(cx, cy + 64, 'SETTINGS', () => this.showPauseSettings()));
    this.pauseOverlay = overlay;
  }

  private showPauseSettings(): void {
    this.pauseOverlay?.setVisible(false);
    this.settingsPanel = new SettingsPanel(
      this,
      this.settings,
      (settings) => {
        this.settings = settings;
        this.applySettings();
        this.closePauseSettings();
      },
      (settings) => {
        this.settings = settings;
        this.applySettings();
      },
    );
  }

  private closePauseSettings(): void {
    this.settingsPanel?.destroy();
    this.settingsPanel = null;
    this.pauseOverlay?.setVisible(true);
  }

  private returnToMainMenu(): void {
    this.clearPauseUi();
    this.pauseState = resetPauseState();
    this.physics.world.resume();
    this.scene.start('MenuScene');
  }

  private clearPauseUi(): void {
    this.settingsPanel?.destroy();
    this.settingsPanel = null;
    this.pauseOverlay?.destroy(true);
    this.pauseOverlay = null;
  }

  private makePauseButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#e8eef7',
      })
      .setOrigin(0.5)
      .setPadding(18, 8, 18, 8)
      .setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setColor('#6affd9'));
    button.on('pointerout', () => button.setColor('#e8eef7'));
    button.on('pointerdown', onClick);
    return button;
  }

  private applySettings(): void {
    this.lander.setExhaustParticlesEnabled(this.settings.exhaustParticles);
  }

  private spawnStars(): void {
    for (let i = 0; i < 60; i++) {
      const s = this.add.image(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT * 0.7,
        'star',
      );
      s.setAlpha(0.3 + Math.random() * 0.4);
      s.setDepth(-10);
    }
    for (let i = 0; i < 25; i++) {
      const s = this.add.image(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT * 0.6,
        'star',
      );
      s.setAlpha(0.7);
      s.setScale(1.5);
      s.setDepth(-9);
    }
  }
}
