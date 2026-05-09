import Phaser from 'phaser';
import {
  COLOR_TERRAIN,
  COLOR_TERRAIN_FILL,
  GAME_HEIGHT,
  GAME_WIDTH,
  PAD_COUNT,
  PAD_HEIGHT,
  PAD_MULTIPLIERS,
  PAD_WIDTHS,
  TERRAIN_MAX_RATIO,
  TERRAIN_MIN_RATIO,
  TERRAIN_SEGMENTS,
} from '../config';
import { generateTerrain, mulberry32, TerrainPoint } from '../utils/midpointDisplacement';
import { SiteDifficulty } from '../systems/RunProgression';

export interface PadInfo {
  x: number;
  y: number;
  width: number;
  multiplier: number;
}

export class Terrain {
  readonly group: Phaser.Physics.Arcade.StaticGroup;
  private graphics: Phaser.GameObjects.Graphics;
  private padSprites: Phaser.GameObjects.Image[] = [];
  private points: TerrainPoint[] = [];
  private pads: PadInfo[] = [];

  constructor(private scene: Phaser.Scene) {
    this.group = scene.physics.add.staticGroup();
    this.graphics = scene.add.graphics();
  }

  regenerate(seed: number, difficulty?: SiteDifficulty): void {
    this.clear();
    this.points = generateTerrain({
      width: GAME_WIDTH,
      segments: TERRAIN_SEGMENTS,
      minY: GAME_HEIGHT * TERRAIN_MIN_RATIO,
      maxY: GAME_HEIGHT * TERRAIN_MAX_RATIO,
      roughness: difficulty?.terrainRoughness,
      seed,
    });
    this.insertPads(seed, difficulty?.padWidthScale ?? 1);
    this.draw();
  }

  getPads(): readonly PadInfo[] {
    return this.pads;
  }

  findPadAt(x: number): PadInfo | null {
    for (const p of this.pads) {
      if (x >= p.x && x <= p.x + p.width) return p;
    }
    return null;
  }

  groundYAt(x: number): number {
    if (this.points.length === 0) return GAME_HEIGHT;
    if (x <= this.points[0].x) return this.points[0].y;
    const last = this.points[this.points.length - 1];
    if (x >= last.x) return last.y;
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      if (x >= a.x && x <= b.x) {
        const t = (x - a.x) / Math.max(1, b.x - a.x);
        return Phaser.Math.Linear(a.y, b.y, t);
      }
    }
    return last.y;
  }

  surfaceYAt(x: number): number {
    const pad = this.findPadAt(x);
    return pad ? this.padSurfaceY(pad) : this.groundYAt(x);
  }

  padSurfaceY(pad: PadInfo): number {
    return pad.y - PAD_HEIGHT;
  }

  private clear(): void {
    this.graphics.clear();
    this.group.clear(true, true);
    for (const s of this.padSprites) s.destroy();
    this.padSprites = [];
    this.pads = [];
  }

  private insertPads(seed: number, padWidthScale: number): void {
    const rand = mulberry32(seed ^ 0x9e3779b9);
    const used: Array<[number, number]> = [];
    let attempts = 0;
    while (this.pads.length < PAD_COUNT && attempts < 200) {
      attempts++;
      const tier = this.pads.length % PAD_WIDTHS.length;
      const width = Math.round(PAD_WIDTHS[tier] * padWidthScale);
      const multiplier = PAD_MULTIPLIERS[tier];
      const x = 30 + rand() * (GAME_WIDTH - 60 - width);
      if (used.some(([a, b]) => x < b + 20 && x + width > a - 20)) continue;
      used.push([x, x + width]);

      const padY = this.flattenSegment(x, x + width);
      this.pads.push({ x, y: padY, width, multiplier });
    }
  }

  private flattenSegment(x0: number, x1: number): number {
    let sumY = 0;
    let count = 0;
    for (const p of this.points) {
      if (p.x >= x0 && p.x <= x1) {
        sumY += p.y;
        count++;
      }
    }
    const avgY = count > 0 ? sumY / count : GAME_HEIGHT * 0.75;
    for (const p of this.points) {
      if (p.x >= x0 && p.x <= x1) p.y = avgY;
    }
    return avgY;
  }

  private draw(): void {
    const g = this.graphics;
    g.lineStyle(2, COLOR_TERRAIN, 1);
    g.fillStyle(COLOR_TERRAIN_FILL, 1);

    g.beginPath();
    g.moveTo(0, GAME_HEIGHT);
    for (const p of this.points) g.lineTo(p.x, p.y);
    g.lineTo(GAME_WIDTH, GAME_HEIGHT);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      g.lineTo(this.points[i].x, this.points[i].y);
    }
    g.strokePath();

    for (const pad of this.pads) {
      const sprite = this.scene.add.image(pad.x + pad.width / 2, pad.y - PAD_HEIGHT / 2, 'pad');
      sprite.setDisplaySize(pad.width, PAD_HEIGHT);
      this.padSprites.push(sprite);

      const label = this.scene.add.text(pad.x + pad.width / 2, pad.y - 18, `${pad.multiplier}x`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#6affd9',
      });
      label.setOrigin(0.5, 1);
      this.padSprites.push(label as unknown as Phaser.GameObjects.Image);
    }
  }
}
