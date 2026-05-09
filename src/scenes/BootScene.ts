import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.generateLanderTexture();
    this.generatePadTexture();
    this.generateParticleTexture();
    this.generateStarTexture();

    this.scene.start('MenuScene');
  }

  private generateLanderTexture(): void {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xd9e2ee, 1);
    g.fillRect(10, 6, 12, 14);
    g.fillStyle(0x6affd9, 1);
    g.fillRect(13, 9, 6, 5);
    g.fillStyle(0xa9b3c1, 1);
    g.fillRect(6, 18, 4, 6);
    g.fillRect(22, 18, 4, 6);
    g.fillRect(2, 24, 8, 2);
    g.fillRect(22, 24, 8, 2);
    g.fillStyle(0xff8c42, 1);
    g.fillRect(13, 22, 6, 4);
    g.generateTexture('lander', 32, 32);
    g.destroy();
  }

  private generatePadTexture(): void {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0x6affd9, 1);
    g.fillRect(0, 2, 32, 4);
    g.fillStyle(0x33ffaa, 0.5);
    g.fillRect(0, 0, 32, 2);
    g.generateTexture('pad', 32, 8);
    g.destroy();
  }

  private generateParticleTexture(): void {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('particle', 4, 4);
    g.destroy();
  }

  private generateStarTexture(): void {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture('star', 2, 2);
    g.destroy();
  }
}
