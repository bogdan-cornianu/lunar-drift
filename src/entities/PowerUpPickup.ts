import Phaser from 'phaser';
import { PowerUpEffectKind, PowerUpPolarity, PowerUpSpawn } from '../systems/PowerUps';

const PICKUP_TINTS: Record<PowerUpEffectKind, number> = {
  fuel: 0xffd166,
  stabilizer: 0x6affd9,
  'hazard-sync': 0xb58cff,
  'fuel-leak': 0xff5677,
  destabilizer: 0xff8c42,
  'pad-blackout': 0xff2d55,
};

export class PowerUpPickup extends Phaser.Physics.Arcade.Sprite {
  readonly kind: PowerUpEffectKind;
  readonly polarity: PowerUpPolarity;
  private floatTween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, spawn: PowerUpSpawn) {
    super(scene, spawn.x, spawn.y, 'power-up');
    this.kind = spawn.kind;
    this.polarity = spawn.polarity;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setTint(PICKUP_TINTS[spawn.kind]);
    this.setDepth(25);
    this.setBlendMode(Phaser.BlendModes.ADD);
    if (spawn.polarity === 'bad') {
      this.setAngle(45);
      this.setAlpha(0.9);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCircle(14, 2, 2);
    body.setImmovable(true);

    this.floatTween = scene.tweens.add({
      targets: this,
      y: spawn.y - 6,
      scale: spawn.polarity === 'bad' ? 1.18 : 1.1,
      alpha: spawn.polarity === 'bad' ? 0.68 : 0.78,
      duration: spawn.polarity === 'bad' ? 520 : 780,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  override destroy(fromScene?: boolean): void {
    this.floatTween.stop();
    super.destroy(fromScene);
  }
}
