import Phaser from 'phaser';
import {
  FUEL_BURN_PER_SEC,
  FUEL_MAX,
  GRAVITY,
  ROTATION_SPEED,
  THRUST,
} from '../config';
import { Controls } from '../systems/Controls';

interface ExhaustParticle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const EXHAUST_POOL_SIZE = 64;
const EXHAUST_TINTS = [0xff8c42, 0xffd166, 0xffffff];
const LEFT_FOOT = new Phaser.Math.Vector2(-10, 10);
const RIGHT_FOOT = new Phaser.Math.Vector2(10, 10);
const HULL_BOTTOM = new Phaser.Math.Vector2(0, 10);

export class Lander extends Phaser.Physics.Arcade.Sprite {
  fuel = FUEL_MAX;
  alive = true;
  windX = 0;
  fuelBurnScale = 1;
  exhaustParticlesEnabled = true;
  private particles: ExhaustParticle[] = [];
  private emitAccumulator = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'lander');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 22);
    body.setOffset(6, 5);
    body.setCollideWorldBounds(true);
    body.onWorldBounds = true;
    body.setMaxVelocity(400, 500);

    for (let i = 0; i < EXHAUST_POOL_SIZE; i++) {
      const img = scene.add.image(0, 0, 'particle');
      img.setBlendMode(Phaser.BlendModes.ADD);
      img.setVisible(false);
      img.setDepth(-1);
      this.particles.push({ img, vx: 0, vy: 0, life: 0, maxLife: 0 });
    }
  }

  reset(x: number, y: number, fuel = FUEL_MAX): void {
    this.setPosition(x, y);
    this.setRotation(0);
    this.setVelocity(0, 0);
    this.setAngularVelocity(0);
    this.fuel = fuel;
    this.alive = true;
    this.setVisible(true);
    this.setActive(true);
    for (const p of this.particles) {
      p.life = 0;
      p.img.setVisible(false);
    }
  }

  kill(): void {
    this.alive = false;
    this.setVisible(false);
    this.setActive(false);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  settle(): void {
    this.alive = false;
    this.setVelocity(0, 0);
    this.setAcceleration(0, 0);
    this.setAngularVelocity(0);
  }

  setWind(windX: number): void {
    this.windX = windX;
  }

  setFuelBurnScale(scale: number): void {
    this.fuelBurnScale = scale;
  }

  setExhaustParticlesEnabled(enabled: boolean): void {
    this.exhaustParticlesEnabled = enabled;
    if (enabled) return;
    this.emitAccumulator = 0;
    for (const p of this.particles) {
      p.life = p.maxLife;
      p.img.setVisible(false);
    }
  }

  getLandingGearPoints(): Phaser.Math.Vector2[] {
    return [this.localPointToWorld(LEFT_FOOT), this.localPointToWorld(RIGHT_FOOT)];
  }

  getCollisionProbePoints(): Phaser.Math.Vector2[] {
    return [
      this.localPointToWorld(LEFT_FOOT),
      this.localPointToWorld(RIGHT_FOOT),
      this.localPointToWorld(HULL_BOTTOM),
    ];
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.updateParticles(dt);

    if (!this.alive) return;
    const controls = (this.scene as Phaser.Scene & { controls: Controls }).controls;

    if (controls.isLeft()) this.setAngularVelocity(-ROTATION_SPEED);
    else if (controls.isRight()) this.setAngularVelocity(ROTATION_SPEED);
    else this.setAngularVelocity(0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const thrusting = controls.isThrust() && this.fuel > 0;

    if (thrusting) {
      const angle = this.rotation - Math.PI / 2;
      body.acceleration.x = Math.cos(angle) * THRUST + this.windX;
      body.acceleration.y = Math.sin(angle) * THRUST + GRAVITY;
      this.fuel = Math.max(0, this.fuel - FUEL_BURN_PER_SEC * this.fuelBurnScale * dt);
      if (this.exhaustParticlesEnabled) this.spawnExhaust(dt);
    } else {
      body.acceleration.x = this.windX;
      body.acceleration.y = GRAVITY;
      this.emitAccumulator = 0;
    }
  }

  private spawnExhaust(dt: number): void {
    this.emitAccumulator += dt;
    const interval = 0.018;
    const tailAngle = this.rotation + Math.PI / 2;
    const offset = 14;
    const baseX = this.x + Math.cos(tailAngle) * offset;
    const baseY = this.y + Math.sin(tailAngle) * offset;

    while (this.emitAccumulator >= interval) {
      this.emitAccumulator -= interval;
      const p = this.findIdleParticle();
      if (!p) return;
      const spread = (Math.random() - 0.5) * 0.6;
      const dir = tailAngle + spread;
      const speed = 90 + Math.random() * 60;
      p.vx = Math.cos(dir) * speed;
      p.vy = Math.sin(dir) * speed;
      p.life = 0;
      p.maxLife = 0.32 + Math.random() * 0.15;
      p.img.setPosition(baseX, baseY);
      p.img.setScale(1.6);
      p.img.setAlpha(1);
      p.img.setTint(EXHAUST_TINTS[Math.floor(Math.random() * EXHAUST_TINTS.length)]);
      p.img.setVisible(true);
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (p.life >= p.maxLife) continue;
      p.life += dt;
      const t = Phaser.Math.Clamp(p.life / p.maxLife, 0, 1);
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.img.setAlpha(1 - t);
      p.img.setScale(1.6 * (1 - t));
      if (p.life >= p.maxLife) p.img.setVisible(false);
    }
  }

  private findIdleParticle(): ExhaustParticle | null {
    for (const p of this.particles) {
      if (p.life >= p.maxLife) return p;
    }
    return null;
  }

  private localPointToWorld(point: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    return new Phaser.Math.Vector2(
      this.x + point.x * cos - point.y * sin,
      this.y + point.x * sin + point.y * cos,
    );
  }
}
