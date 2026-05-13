import { describe, expect, it } from 'vitest';
import {
  AudioController,
  AudioCue,
  AudioLoop,
  DEFAULT_AUDIO_PREFERENCES,
} from './AudioController';

class FakeAudioEngine {
  readonly events: string[] = [];

  unlock(): void {
    this.events.push('unlock');
  }

  play(cue: AudioCue): void {
    this.events.push(`play:${cue}`);
  }

  start(loop: AudioLoop): void {
    this.events.push(`start:${loop}`);
  }

  stop(loop: AudioLoop): void {
    this.events.push(`stop:${loop}`);
  }

  stopAll(): void {
    this.events.push('stopAll');
  }
}

describe('audio controller', () => {
  it('starts menu music when music is enabled', () => {
    const engine = new FakeAudioEngine();
    const audio = new AudioController(engine);

    audio.enterMenu();

    expect(engine.events).toEqual(['start:menu-music']);
  });

  it('requests menu music again after unlocking on the menu screen', () => {
    const engine = new FakeAudioEngine();
    const audio = new AudioController(engine);

    audio.enterMenu();
    audio.unlock();

    expect(engine.events).toEqual(['start:menu-music', 'unlock', 'start:menu-music']);
  });

  it('stops menu music and thrust when gameplay starts', () => {
    const engine = new FakeAudioEngine();
    const audio = new AudioController(engine);

    audio.enterMenu();
    audio.setThrusting(true);
    audio.enterGameplay();

    expect(engine.events).toEqual([
      'start:menu-music',
      'start:thrust',
      'stop:menu-music',
      'stop:thrust',
    ]);
  });

  it('does not repeat thrust loop starts while already thrusting', () => {
    const engine = new FakeAudioEngine();
    const audio = new AudioController(engine);

    audio.setThrusting(true);
    audio.setThrusting(true);
    audio.setThrusting(false);

    expect(engine.events).toEqual(['start:thrust', 'stop:thrust']);
  });

  it('routes positive and negative power ups to different cues', () => {
    const engine = new FakeAudioEngine();
    const audio = new AudioController(engine);

    audio.playPowerUp('fuel');
    audio.playPowerUp('stabilizer');
    audio.playPowerUp('fuel-leak');
    audio.playPowerUp('pad-blackout');

    expect(engine.events).toEqual([
      'play:power-up-good',
      'play:power-up-good',
      'play:power-up-bad',
      'play:power-up-bad',
    ]);
  });

  it('mutes SFX and music independently', () => {
    const engine = new FakeAudioEngine();
    const audio = new AudioController(engine, {
      ...DEFAULT_AUDIO_PREFERENCES,
      music: false,
      soundEffects: false,
    });

    audio.enterMenu();
    audio.setThrusting(true);
    audio.playCrash();

    expect(engine.events).toEqual([]);
  });

  it('starts thrust after sound effects are re-enabled while thrust is held', () => {
    const engine = new FakeAudioEngine();
    const audio = new AudioController(engine, {
      music: true,
      soundEffects: false,
    });

    audio.setThrusting(true);
    audio.setPreferences({ music: true, soundEffects: true });

    expect(engine.events).toEqual(['start:thrust']);
  });
});
