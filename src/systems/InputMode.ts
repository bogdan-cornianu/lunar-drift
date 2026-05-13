export type InputScheme = 'keyboard' | 'touch';

export type InputDeviceSnapshot = {
  android: boolean;
  coarsePointer: boolean;
  iOS: boolean;
  maxTouchPoints: number;
  msMaxTouchPoints: number;
  touch: boolean;
};

type PhaserDeviceLike = {
  input?: {
    touch?: boolean;
  };
  os?: {
    android?: boolean;
    iOS?: boolean;
  };
};

type BrowserInputEnvironment = {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: {
    maxTouchPoints?: number;
    msMaxTouchPoints?: number;
  };
};

export function createInputDeviceSnapshot(
  device?: PhaserDeviceLike,
  browser: BrowserInputEnvironment = globalThis,
): InputDeviceSnapshot {
  return {
    android: Boolean(device?.os?.android),
    coarsePointer: Boolean(browser.matchMedia?.('(pointer: coarse)').matches),
    iOS: Boolean(device?.os?.iOS),
    maxTouchPoints: browser.navigator?.maxTouchPoints ?? 0,
    msMaxTouchPoints: browser.navigator?.msMaxTouchPoints ?? 0,
    touch: Boolean(device?.input?.touch),
  };
}

export function detectInputScheme(input: InputDeviceSnapshot): InputScheme {
  return input.android ||
    input.coarsePointer ||
    input.iOS ||
    input.maxTouchPoints > 0 ||
    input.msMaxTouchPoints > 0 ||
    input.touch
    ? 'touch'
    : 'keyboard';
}

export function controlHintForScheme(scheme: InputScheme): string {
  if (scheme === 'touch') return 'USE ON-SCREEN CONTROLS TO ROTATE AND THRUST';
  return 'WASD / ARROW KEYS TO CONTROL THE LANDER';
}
