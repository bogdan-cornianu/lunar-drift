import { describe, expect, it } from 'vitest';
import { generateTerrain, mulberry32 } from './midpointDisplacement';

describe('mulberry32', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);

    expect([a(), a(), a(), a()]).toEqual([b(), b(), b(), b()]);
  });
});

describe('generateTerrain', () => {
  it('generates deterministic terrain for the same options', () => {
    const opts = { width: 800, segments: 64, minY: 300, maxY: 500, roughness: 0.6, seed: 42 };

    expect(generateTerrain(opts)).toEqual(generateTerrain(opts));
  });

  it('keeps points inside the configured vertical bounds', () => {
    const points = generateTerrain({
      width: 800,
      segments: 64,
      minY: 300,
      maxY: 500,
      roughness: 0.8,
      seed: 99,
    });

    expect(points.every((p) => p.y >= 300 && p.y <= 500)).toBe(true);
  });

  it('uses the next power-of-two segment count plus one point', () => {
    const points = generateTerrain({
      width: 800,
      segments: 63,
      minY: 300,
      maxY: 500,
      seed: 1,
    });

    expect(points).toHaveLength(65);
    expect(points[0].x).toBe(0);
    expect(points[points.length - 1].x).toBe(800);
  });
});
