import { describe, expect, it } from 'vitest';
import { createPauseState, pauseState, resetPauseState, resumeState } from './PauseState';

describe('PauseState', () => {
  it('starts unpaused', () => {
    expect(createPauseState()).toEqual({ paused: false });
  });

  it('pauses and resumes gameplay', () => {
    const paused = pauseState(createPauseState());
    const resumed = resumeState(paused);

    expect(paused.paused).toBe(true);
    expect(resumed.paused).toBe(false);
  });

  it('resets to unpaused after leaving a paused run', () => {
    const pausedBeforeMainMenu = pauseState(createPauseState());
    const newRunState = resetPauseState();

    expect(pausedBeforeMainMenu.paused).toBe(true);
    expect(newRunState.paused).toBe(false);
  });
});
