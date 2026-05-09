export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const GRAVITY = 30;
export const THRUST = 90;
export const ROTATION_SPEED = 110;

export const FUEL_MAX = 100;
export const FUEL_BURN_PER_SEC = 12;

export const SAFE_VX = 22;
export const SAFE_VY = 35;
export const SAFE_ANGLE_DEG = 12;

export const STARTING_LIVES = 3;
export const TERRAIN_SEGMENTS = 64;
export const TERRAIN_MIN_RATIO = 0.55;
export const TERRAIN_MAX_RATIO = 0.88;

export const PAD_WIDTHS = [120, 70, 38] as const;
export const PAD_MULTIPLIERS = [2, 5, 10] as const;
export const PAD_COUNT = 4;
export const PAD_HEIGHT = 8;

export const PERFECT_VX = 9;
export const PERFECT_VY = 14;
export const PERFECT_ANGLE_DEG = 5;
export const STREAK_BONUS = 75;
export const OBJECTIVE_BONUS = 250;
export const CLEAN_LANDING_REFUEL = 1;
export const STANDARD_LANDING_REFUEL = 0.8;
export const ROUGH_LANDING_REFUEL = 0.62;
export const MIN_PAD_WIDTH_SCALE = 0.72;
export const MAX_TERRAIN_ROUGHNESS = 0.82;
export const MAX_WIND = 16;

export const COLOR_BG = 0x05070d;
export const COLOR_TERRAIN = 0xa9b3c1;
export const COLOR_TERRAIN_FILL = 0x1d2330;
export const COLOR_PAD = 0x6affd9;
export const COLOR_PAD_GLOW = 0x33ffaa;
