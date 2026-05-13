import type { PowerUpEffectKind } from './PowerUps';

export type AudioCue =
  | 'ui-select'
  | 'landing'
  | 'collision'
  | 'explosion'
  | 'power-up-good'
  | 'power-up-bad'
  | 'pause'
  | 'resume';

export type AudioLoop = 'menu-music' | 'thrust';

export interface AudioPreferences {
  music: boolean;
  soundEffects: boolean;
}

export interface AudioEngine {
  unlock(): void;
  play(cue: AudioCue): void;
  start(loop: AudioLoop): void;
  stop(loop: AudioLoop): void;
  stopAll(): void;
}

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  music: true,
  soundEffects: true,
};

export class AudioController {
  private preferences: AudioPreferences;
  private thrusting = false;
  private inMenu = false;

  constructor(
    private engine: AudioEngine,
    preferences: AudioPreferences = DEFAULT_AUDIO_PREFERENCES,
  ) {
    this.preferences = { ...preferences };
  }

  unlock(): void {
    this.engine.unlock();
    if (this.inMenu && this.preferences.music) this.engine.start('menu-music');
  }

  setPreferences(preferences: AudioPreferences): void {
    const previous = this.preferences;
    this.preferences = { ...preferences };

    if (previous.music && !this.preferences.music) this.engine.stop('menu-music');
    if (previous.soundEffects && !this.preferences.soundEffects) {
      this.thrusting = false;
      this.engine.stop('thrust');
    }
    if (!previous.soundEffects && this.preferences.soundEffects && this.thrusting) {
      this.engine.start('thrust');
    }
    if (!previous.music && this.preferences.music && this.inMenu) {
      this.engine.start('menu-music');
    }
  }

  enterMenu(): void {
    this.inMenu = true;
    this.setThrusting(false);
    if (this.preferences.music) this.engine.start('menu-music');
  }

  enterGameplay(): void {
    this.inMenu = false;
    this.engine.stop('menu-music');
    this.setThrusting(false);
  }

  setThrusting(thrusting: boolean): void {
    if (this.thrusting === thrusting) return;
    this.thrusting = thrusting;

    if (!this.preferences.soundEffects) return;
    if (thrusting) this.engine.start('thrust');
    else this.engine.stop('thrust');
  }

  playUiSelect(): void {
    this.playSoundEffect('ui-select');
  }

  playLanding(): void {
    this.playSoundEffect('landing');
  }

  playCrash(): void {
    if (!this.preferences.soundEffects) return;
    this.engine.play('collision');
    this.engine.play('explosion');
  }

  playPowerUp(kind: PowerUpEffectKind): void {
    this.playSoundEffect(isBadPowerUp(kind) ? 'power-up-bad' : 'power-up-good');
  }

  playPause(): void {
    this.playSoundEffect('pause');
    this.setThrusting(false);
  }

  playResume(): void {
    this.playSoundEffect('resume');
  }

  stopAll(): void {
    this.thrusting = false;
    this.inMenu = false;
    this.engine.stopAll();
  }

  private playSoundEffect(cue: AudioCue): void {
    if (!this.preferences.soundEffects) return;
    this.engine.play(cue);
  }
}

function isBadPowerUp(kind: PowerUpEffectKind): boolean {
  return kind === 'fuel-leak' || kind === 'destabilizer' || kind === 'pad-blackout';
}
