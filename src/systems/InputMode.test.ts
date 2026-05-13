import { describe, expect, it } from 'vitest';
import { controlHintForScheme, detectInputScheme } from './InputMode';

describe('input mode detection', () => {
  it('uses keyboard controls when no touch or mobile signals are present', () => {
    expect(
      detectInputScheme({
        android: false,
        coarsePointer: false,
        iOS: false,
        maxTouchPoints: 0,
        msMaxTouchPoints: 0,
        touch: false,
      }),
    ).toBe('keyboard');
  });

  it('uses touch controls for iOS and Android devices', () => {
    expect(
      detectInputScheme({
        android: true,
        coarsePointer: false,
        iOS: false,
        maxTouchPoints: 0,
        msMaxTouchPoints: 0,
        touch: false,
      }),
    ).toBe('touch');

    expect(
      detectInputScheme({
        android: false,
        coarsePointer: false,
        iOS: true,
        maxTouchPoints: 0,
        msMaxTouchPoints: 0,
        touch: false,
      }),
    ).toBe('touch');
  });

  it('uses touch controls for coarse pointer and touch-point devices', () => {
    expect(
      detectInputScheme({
        android: false,
        coarsePointer: true,
        iOS: false,
        maxTouchPoints: 0,
        msMaxTouchPoints: 0,
        touch: false,
      }),
    ).toBe('touch');

    expect(
      detectInputScheme({
        android: false,
        coarsePointer: false,
        iOS: false,
        maxTouchPoints: 2,
        msMaxTouchPoints: 0,
        touch: false,
      }),
    ).toBe('touch');
  });
});

describe('control hints', () => {
  it('describes keyboard controls for desktop play', () => {
    expect(controlHintForScheme('keyboard')).toBe('WASD / ARROW KEYS TO CONTROL THE LANDER');
  });

  it('describes on-screen controls for touch play', () => {
    expect(controlHintForScheme('touch')).toBe('USE ON-SCREEN CONTROLS TO ROTATE AND THRUST');
  });
});
