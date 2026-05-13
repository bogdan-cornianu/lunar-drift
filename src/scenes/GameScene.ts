import Phaser from 'phaser';
import {
  FUEL_MAX,
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../config';
import { Lander } from '../entities/Lander';
import { PowerUpPickup } from '../entities/PowerUpPickup';
import { Terrain, PadInfo } from '../entities/Terrain';
import { Controls } from '../systems/Controls';
import {
  DEFAULT_DIFFICULTY,
  DifficultyLevel,
  getDifficultyProfile,
} from '../systems/Difficulty';
import { getGameAudio, preferencesFromSettings } from '../systems/GameAudio';
import { isHighScore } from '../systems/HighScores';
import { Hud } from '../systems/Hud';
import {
  computeLandingCue,
  formatObjectiveStatus,
  getLandingCueLimits,
} from '../systems/HudState';
import {
  createPauseState,
  PauseState,
  pauseState,
  resetPauseState,
  resumeState,
} from '../systems/PauseState';
import { canLandOnPad } from '../systems/PadHazards';
import {
  applyDestabilizer,
  applyFuelCell,
  applyFuelLeak,
  applyStabilizerBurst,
  createPowerUpSpawns,
  HAZARD_SYNC_DURATION_MS,
  PowerUpEffectKind,
} from '../systems/PowerUps';
import { RunProgression } from '../systems/RunProgression';
import { computeLandingScore, getLandingLimits } from '../systems/Scoring';
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
  private lives = getDifficultyProfile(DEFAULT_DIFFICULTY).lives;
  private state: GameState = 'flying';
  private currentSeed = 0;
  private nextFuel = FUEL_MAX;
  private settings: GameSettings = loadSettings();
  private runDifficulty: DifficultyLevel = DEFAULT_DIFFICULTY;
  private pauseState: PauseState = createPauseState();
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private settingsPanel: SettingsPanel | null = null;
  private powerUps: PowerUpPickup[] = [];
  private collectedPowerUps = new Set<string>();
  private audio = getGameAudio();

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor('#05070d');

    this.spawnStars();

    this.settings = loadSettings();
    this.audio.setPreferences(preferencesFromSettings(this.settings));
    this.audio.enterGameplay();
    this.runDifficulty = this.settings.difficulty;

    this.controls = new Controls(this);
    this.terrain = new Terrain(this);
    this.progression = new RunProgression(this.runDifficulty);
    this.pauseState = resetPauseState();
    this.clearPauseUi();
    this.physics.world.resume();
    this.currentSeed = this.makeSeed();
    this.progression.prepareSite(this.currentSeed);
    this.terrain.regenerate(this.currentSeed, this.progression.getDifficulty(), this.time.now);

    this.lander = new Lander(this, GAME_WIDTH / 2, 60);
    this.lander.setWind(this.progression.getDifficulty().windX);
    this.lander.setFuelBurnScale(getDifficultyProfile(this.runDifficulty).fuelBurnScale);
    this.applySettings();

    this.hud = new Hud(this);
    this.input.keyboard?.off('keydown-ESC');
    this.input.keyboard?.on('keydown-ESC', () => this.handleEscape());
    this.input.keyboard?.once('keydown', () => this.audio.unlock());
    this.input.once('pointerdown', () => this.audio.unlock());

    this.score = 0;
    this.lives = getDifficultyProfile(this.runDifficulty).lives;
    this.nextFuel = FUEL_MAX;
    this.state = 'flying';
    this.collectedPowerUps.clear();
    this.spawnPowerUps();
  }

  override update(time: number, delta: number): void {
    if (this.pauseState.paused) return;

    this.terrain.updateHazards(time);
    this.lander.update(time, delta);
    this.audio.setThrusting(this.isLanderThrusting());

    if (this.state === 'flying') {
      this.checkPowerUpContact();
      this.checkTerrainContact();
    }

    if (this.state === 'flying') {
      const body = this.lander.body as Phaser.Physics.Arcade.Body;
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      const angleDeg = this.normalizedAngleDeg();
      const objective = this.progression.objective;
      this.hud.update({
        site: this.progression.site,
        score: this.score,
        lives: this.lives,
        fuel: this.lander.fuel,
        fuelMax: FUEL_MAX,
        vx,
        vy,
        angleDeg,
        altitude: this.estimateAltitude(),
        streak: this.progression.streak,
        objective: formatObjectiveStatus(objective, {
          fuel: this.lander.fuel,
          fuelMax: FUEL_MAX,
          vy,
          multiplier: 0,
        }),
        targetFuel: objective.kind === 'fuel' ? objective.fuelMin : null,
        windX: this.progression.getDifficulty().windX,
        landingCue: computeLandingCue(
          { vx, vy, angleDeg },
          getLandingCueLimits(this.runDifficulty),
        ),
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
    this.audio.setThrusting(false);

    const body = this.lander.body as Phaser.Physics.Arcade.Body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const angleDeg = this.normalizedAngleDeg();
    const landingLimits = getLandingLimits(this.runDifficulty);
    const upright = Math.abs(angleDeg) <= landingLimits.safeAngleDeg;
    const slow = Math.abs(vx) <= landingLimits.safeVx && Math.abs(vy) <= landingLimits.safeVy;
    const padOnline = pad
      ? canLandOnPad(
          pad.hazard,
          this.time.now,
          this.terrain.isHazardSyncActive(this.time.now),
          this.terrain.isPadDisabled(pad),
        )
      : false;

    if (pad && padOnline && upright && slow) {
      this.audio.playLanding();
      this.snapLanderToTerrain();
      this.lander.settle();
      const provisional = computeLandingScore(
        {
          multiplier: pad.multiplier,
          fuelRemaining: this.lander.fuel,
          vx,
          vy,
          angleDeg,
          streak: this.progression.streak,
          objectiveMet: false,
        },
        this.runDifficulty,
      );
      const outcome = this.progression.resolveLanding({
        grade: provisional.grade,
        fuelRemaining: this.lander.fuel,
        multiplier: pad.multiplier,
        vy,
      });
      const scoreResult = computeLandingScore(
        {
          multiplier: pad.multiplier,
          fuelRemaining: this.lander.fuel,
          vx,
          vy,
          angleDeg,
          streak: this.progression.streak - 1,
          objectiveMet: outcome.objectiveMet,
        },
        this.runDifficulty,
      );
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
      this.audio.playCrash();
      this.lives -= 1;
      this.progression.resetStreak();
      this.hud.showToast(this, this.lives > 0 ? 'CRASHED' : 'GAME OVER', '#ff5677');
      this.hud.showBreakdown(this, this.crashReason(Boolean(pad), Boolean(pad && !padOnline), upright, slow));
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

  private spawnPowerUps(): void {
    for (const powerUp of this.powerUps) powerUp.destroy();
    this.powerUps = [];

    const spawns = createPowerUpSpawns(
      {
        seed: this.currentSeed,
        site: this.progression.site,
        pads: this.terrain.getPads(),
        surfaceYAt: (x) => this.terrain.surfaceYAt(x),
      },
      this.runDifficulty,
    ).filter((spawn) => !this.collectedPowerUps.has(this.powerUpKey(spawn.polarity)));

    this.powerUps = spawns.map((spawn) => new PowerUpPickup(this, spawn));
  }

  private checkPowerUpContact(): void {
    for (const powerUp of [...this.powerUps]) {
      if (!powerUp.active) continue;
      const distance = Phaser.Math.Distance.Between(
        this.lander.x,
        this.lander.y,
        powerUp.x,
        powerUp.y,
      );
      if (distance <= 30) this.collectPowerUp(powerUp);
    }
  }

  private collectPowerUp(powerUp: PowerUpPickup): void {
    const { kind, x, y } = powerUp;
    this.collectedPowerUps.add(this.powerUpKey(powerUp.polarity));
    this.powerUps = this.powerUps.filter((candidate) => candidate !== powerUp);
    powerUp.destroy();

    this.applyPowerUp(kind, x);
    this.audio.playPowerUp(kind);
    this.playPowerUpBurst(x, y, kind);
  }

  private applyPowerUp(kind: PowerUpEffectKind, x: number): void {
    if (kind === 'fuel') {
      this.lander.fuel = applyFuelCell(this.lander.fuel);
      this.hud.showToast(this, 'FUEL +25', '#ffd166');
      return;
    }

    if (kind === 'stabilizer') {
      const body = this.lander.body as Phaser.Physics.Arcade.Body;
      const stabilized = applyStabilizerBurst({
        vx: body.velocity.x,
        vy: body.velocity.y,
        rotationRad: this.lander.rotation,
      });
      this.lander.setVelocity(stabilized.vx, stabilized.vy);
      this.lander.setAngularVelocity(stabilized.angularVelocity);
      this.lander.setRotation(stabilized.rotationRad);
      this.hud.showToast(this, 'STABILIZED', '#6affd9');
      return;
    }

    if (kind === 'hazard-sync') {
      this.terrain.applyHazardSync(this.time.now, HAZARD_SYNC_DURATION_MS);
      this.hud.showToast(this, 'PADS SYNCED', '#d8c2ff');
      return;
    }

    if (kind === 'fuel-leak') {
      this.lander.fuel = applyFuelLeak(this.lander.fuel);
      this.hud.showToast(this, 'FUEL LEAK', '#ff5677');
      return;
    }

    if (kind === 'destabilizer') {
      const body = this.lander.body as Phaser.Physics.Arcade.Body;
      const destabilized = applyDestabilizer({
        vx: body.velocity.x,
        vy: body.velocity.y,
        rotationRad: this.lander.rotation,
      });
      this.lander.setVelocity(destabilized.vx, destabilized.vy);
      this.lander.setAngularVelocity(destabilized.angularVelocity);
      this.lander.setRotation(destabilized.rotationRad);
      this.hud.showToast(this, 'DESTABILIZED', '#ff8c42');
      if (this.settings.screenShake && !this.settings.reducedMotion) {
        this.cameras.main.shake(150, 0.004);
      }
      return;
    }

    this.terrain.blackoutNearestPad(x);
    this.hud.showToast(this, 'PAD BLACKOUT', '#ff2d55');
  }

  private powerUpKey(polarity: string): string {
    return `${this.progression.site}:${this.currentSeed}:${polarity}`;
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
    this.terrain.regenerate(this.currentSeed, difficulty, this.time.now);
    this.lander.setWind(difficulty.windX);
    this.lander.setFuelBurnScale(getDifficultyProfile(this.runDifficulty).fuelBurnScale);
    this.lander.reset(GAME_WIDTH / 2, 60, this.nextFuel);
    this.applySettings();
    this.spawnPowerUps();
    this.state = 'flying';
  }

  private endGame(): void {
    this.state = 'gameover';
    this.audio.setThrusting(false);
    if (isHighScore(this.score, this.runDifficulty)) {
      this.scene.start('NewHighScoreScene', {
        score: this.score,
        difficulty: this.runDifficulty,
      });
      return;
    }
    this.scene.start('GameOverScene', {
      score: this.score,
      difficulty: this.runDifficulty,
    });
  }

  private makeSeed(): number {
    return Math.floor(Math.random() * 2 ** 31);
  }

  private normalizedAngleDeg(): number {
    return Phaser.Math.Angle.WrapDegrees(Phaser.Math.RadToDeg(this.lander.rotation));
  }

  private crashReason(onPad: boolean, padOffline: boolean, upright: boolean, slow: boolean): string {
    if (!onPad) return 'MISSED LANDING PAD';
    if (padOffline) return 'PAD OFFLINE';
    if (!upright) return 'TOUCHDOWN ANGLE TOO HIGH';
    if (!slow) return 'TOUCHDOWN SPEED TOO HIGH';
    return 'UNSAFE TOUCHDOWN';
  }

  private playPowerUpBurst(x: number, y: number, kind: PowerUpEffectKind): void {
    const tint = this.powerUpTint(kind);
    const core = this.add.circle(x, y, 8, tint, 0.85);
    core.setBlendMode(Phaser.BlendModes.ADD);
    core.setDepth(45);

    const ring = this.add.circle(x, y, 14);
    ring.setStrokeStyle(3, tint, 0.95);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.setDepth(44);

    const duration = this.settings.reducedMotion ? 260 : 420;
    this.tweens.add({
      targets: core,
      alpha: 0,
      scale: this.settings.reducedMotion ? 1.4 : 2.1,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => core.destroy(),
    });
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: this.settings.reducedMotion ? 1.6 : 3.2,
      duration: duration + 120,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    if (this.settings.reducedMotion) return;

    for (let i = 0; i < 18; i++) {
      const particle = this.add.image(x, y, 'particle');
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 36;
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setDepth(43);
      particle.setScale(1.2 + Math.random() * 1.4);
      particle.setTint(i % 4 === 0 ? 0xffffff : tint);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 300 + Math.random() * 180,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private powerUpTint(kind: PowerUpEffectKind): number {
    if (kind === 'fuel') return 0xffd166;
    if (kind === 'stabilizer') return 0x6affd9;
    if (kind === 'hazard-sync') return 0xb58cff;
    if (kind === 'fuel-leak') return 0xff5677;
    if (kind === 'destabilizer') return 0xff8c42;
    return 0xff2d55;
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
    this.audio.playPause();
    this.pauseState = pauseState(this.pauseState);
    this.physics.world.pause();
    this.showPauseOverlay();
  }

  private resumeGame(): void {
    this.clearPauseUi();
    this.physics.world.resume();
    this.pauseState = resumeState(this.pauseState);
    this.audio.playResume();
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
        this.audio.setPreferences(preferencesFromSettings(settings));
        this.applySettings();
        this.closePauseSettings();
      },
      (settings) => {
        this.settings = settings;
        this.audio.setPreferences(preferencesFromSettings(settings));
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
    this.audio.setThrusting(false);
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

  private isLanderThrusting(): boolean {
    return (
      this.state === 'flying' &&
      this.lander.alive &&
      this.lander.fuel > 0 &&
      this.controls.isThrust()
    );
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
