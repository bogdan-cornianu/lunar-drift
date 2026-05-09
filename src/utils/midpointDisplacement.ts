export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TerrainOptions {
  width: number;
  segments: number;
  minY: number;
  maxY: number;
  roughness?: number;
  seed?: number;
}

export interface TerrainPoint {
  x: number;
  y: number;
}

export function generateTerrain(opts: TerrainOptions): TerrainPoint[] {
  const { width, segments, minY, maxY } = opts;
  const roughness = opts.roughness ?? 0.6;
  const rand = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 31));

  const size = nextPow2(segments) + 1;
  const heights = new Array<number>(size);
  const range = maxY - minY;
  const mid = (minY + maxY) / 2;

  heights[0] = mid + (rand() - 0.5) * range * 0.4;
  heights[size - 1] = mid + (rand() - 0.5) * range * 0.4;

  let step = size - 1;
  let amplitude = range * 0.55;
  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < size; i += step) {
      const avg = (heights[i - half] + heights[i + half]) / 2;
      heights[i] = clamp(avg + (rand() - 0.5) * amplitude, minY, maxY);
    }
    step = half;
    amplitude *= roughness;
  }

  const points: TerrainPoint[] = [];
  for (let i = 0; i < size; i++) {
    points.push({ x: (i / (size - 1)) * width, y: heights[i] });
  }
  return points;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
