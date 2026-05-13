import { describe, expect, it } from 'vitest';
import { getMenuMusicEvents } from './SynthAudioEngine';

describe('synth audio menu music', () => {
  it('uses a retro arcade sci-fi profile for the main menu loop', () => {
    const downbeat = getMenuMusicEvents(0);
    const arpStep = getMenuMusicEvents(2);
    const tickStep = getMenuMusicEvents(4);
    const hookStep = getMenuMusicEvents(30);

    expect(downbeat).toContainEqual(
      expect.objectContaining({
        kind: 'tone',
        type: 'square',
        frequency: 82.41,
      }),
    );
    expect(arpStep).toContainEqual(
      expect.objectContaining({
        kind: 'tone',
        type: 'square',
        lowpass: 4200,
      }),
    );
    expect(tickStep).toContainEqual(
      expect.objectContaining({
        kind: 'noise',
        highpass: 2400,
      }),
    );
    expect(hookStep).toContainEqual(
      expect.objectContaining({
        kind: 'tone',
        type: 'square',
        frequency: 987.77,
      }),
    );
  });
});
