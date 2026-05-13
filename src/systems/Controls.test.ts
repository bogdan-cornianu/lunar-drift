import { describe, expect, it, vi } from 'vitest';
import { Controls } from './Controls';
import { TouchControlState } from './TouchControlState';

vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        KeyCodes: {
          A: 65,
          D: 68,
          SPACE: 32,
          W: 87,
        },
      },
    },
  },
}));

describe('TouchControlState', () => {
  it('keeps a held action active until its pointer releases', () => {
    const state = new TouchControlState();

    state.press('left', 1);

    expect(state.isActive('left')).toBe(true);
    expect(state.isActive('right')).toBe(false);

    state.release('left', 1);

    expect(state.isActive('left')).toBe(false);
  });

  it('keeps an action active while another pointer still holds it', () => {
    const state = new TouchControlState();

    state.press('thrust', 1);
    state.press('thrust', 2);
    state.release('thrust', 1);

    expect(state.isActive('thrust')).toBe(true);

    state.release('thrust', 2);

    expect(state.isActive('thrust')).toBe(false);
  });

  it('clears all held touch actions at once', () => {
    const state = new TouchControlState();

    state.press('left', 1);
    state.press('thrust', 2);
    state.clear();

    expect(state.isActive('left')).toBe(false);
    expect(state.isActive('thrust')).toBe(false);
  });
});

describe('Controls', () => {
  it('combines keyboard and held touch input for lander actions', () => {
    const cursors = {
      left: { isDown: false },
      right: { isDown: false },
      up: { isDown: false },
    };
    const keys = new Map<number, { isDown: boolean }>();
    const controls = new Controls({
      input: {
        keyboard: {
          addKey: (code: number) => {
            const key = { isDown: false };
            keys.set(code, key);
            return key;
          },
          createCursorKeys: () => cursors,
        },
      },
    } as Phaser.Scene);

    controls.pressTouch('left', 1);
    keys.get(87)!.isDown = true;

    expect(controls.isLeft()).toBe(true);
    expect(controls.isRight()).toBe(false);
    expect(controls.isThrust()).toBe(true);

    controls.releaseTouch('left', 1);
    keys.get(87)!.isDown = false;
    cursors.right.isDown = true;

    expect(controls.isLeft()).toBe(false);
    expect(controls.isRight()).toBe(true);
    expect(controls.isThrust()).toBe(false);
  });
});
