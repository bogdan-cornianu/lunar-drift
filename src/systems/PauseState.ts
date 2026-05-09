export interface PauseState {
  paused: boolean;
}

export function createPauseState(): PauseState {
  return { paused: false };
}

export function pauseState(state: PauseState): PauseState {
  return { ...state, paused: true };
}

export function resumeState(state: PauseState): PauseState {
  return { ...state, paused: false };
}

export function resetPauseState(): PauseState {
  return createPauseState();
}
