import {
  AudioController,
  AudioPreferences,
  DEFAULT_AUDIO_PREFERENCES,
} from './AudioController';
import { GameSettings } from './Settings';
import { SynthAudioEngine } from './SynthAudioEngine';

let gameAudio: AudioController | null = null;

export function getGameAudio(): AudioController {
  if (!gameAudio) gameAudio = new AudioController(new SynthAudioEngine());
  return gameAudio;
}

export function preferencesFromSettings(settings: GameSettings): AudioPreferences {
  return {
    music: settings.music ?? DEFAULT_AUDIO_PREFERENCES.music,
    soundEffects: settings.soundEffects ?? DEFAULT_AUDIO_PREFERENCES.soundEffects,
  };
}
