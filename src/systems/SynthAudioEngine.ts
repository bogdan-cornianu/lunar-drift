import { AudioCue, AudioEngine, AudioLoop } from './AudioController';

interface AudioWindow extends Window {
  webkitAudioContext?: new () => AudioContext;
}

const MASTER_GAIN = 0.72;

export class SynthAudioEngine implements AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private thrust: ThrustLoop | null = null;
  private menuMusic: MenuMusicLoop | null = null;

  unlock(): void {
    const context = this.ensureContext();
    if (!context) return;
    void context.resume();
  }

  play(cue: AudioCue): void {
    const context = this.ensureContext();
    const output = this.master;
    if (!context || !output) return;
    void context.resume();

    if (cue === 'ui-select') playUiSelect(context, output);
    else if (cue === 'landing') playLanding(context, output);
    else if (cue === 'collision') playCollision(context, output);
    else if (cue === 'explosion') playExplosion(context, output);
    else if (cue === 'power-up-good') playPowerUpGood(context, output);
    else if (cue === 'power-up-bad') playPowerUpBad(context, output);
    else if (cue === 'pause') playPause(context, output);
    else playResume(context, output);
  }

  start(loop: AudioLoop): void {
    const context = this.ensureContext();
    const output = this.master;
    if (!context || !output) return;
    void context.resume();

    if (loop === 'thrust') {
      if (this.thrust) return;
      this.thrust = new ThrustLoop(context, output);
      this.thrust.start();
      return;
    }

    if (this.menuMusic) return;
    this.menuMusic = new MenuMusicLoop(context, output);
    this.menuMusic.start();
  }

  stop(loop: AudioLoop): void {
    if (loop === 'thrust') {
      this.thrust?.stop();
      this.thrust = null;
      return;
    }

    this.menuMusic?.stop();
    this.menuMusic = null;
  }

  stopAll(): void {
    this.stop('thrust');
    this.stop('menu-music');
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === 'undefined') return null;

    const audioWindow = window as AudioWindow;
    const AudioContextCtor =
      typeof AudioContext === 'undefined' ? audioWindow.webkitAudioContext : AudioContext;
    if (!AudioContextCtor) return null;

    const context = new AudioContextCtor();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(context.destination);
    return context;
  }
}

class ThrustLoop {
  private gain: GainNode;
  private filter: BiquadFilterNode;
  private rumble: OscillatorNode;
  private noise: AudioBufferSourceNode;

  constructor(
    private context: AudioContext,
    destination: AudioNode,
  ) {
    this.gain = context.createGain();
    this.filter = context.createBiquadFilter();
    this.rumble = context.createOscillator();
    this.noise = context.createBufferSource();

    this.gain.gain.value = 0;
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 760;
    this.filter.Q.value = 3.2;
    this.rumble.type = 'sawtooth';
    this.rumble.frequency.value = 58;
    this.noise.buffer = createNoiseBuffer(context, 1.2);
    this.noise.loop = true;

    const rumbleGain = context.createGain();
    const noiseGain = context.createGain();
    rumbleGain.gain.value = 0.18;
    noiseGain.gain.value = 0.34;
    this.rumble.connect(rumbleGain);
    this.noise.connect(noiseGain);
    rumbleGain.connect(this.filter);
    noiseGain.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(destination);
  }

  start(): void {
    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(0.001, now);
    this.gain.gain.exponentialRampToValueAtTime(0.24, now + 0.08);
    this.rumble.start(now);
    this.noise.start(now);
  }

  stop(): void {
    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setTargetAtTime(0.001, now, 0.035);
    this.rumble.stop(now + 0.16);
    this.noise.stop(now + 0.16);
  }
}

class MenuMusicLoop {
  private intervalId: number | null = null;
  private output: GainNode;
  private nextStepTime = 0;
  private step = 0;

  constructor(
    private context: AudioContext,
    destination: AudioNode,
  ) {
    this.output = context.createGain();
    this.output.gain.value = 0;
    this.output.connect(destination);
  }

  start(): void {
    const now = this.context.currentTime;
    this.nextStepTime = now + 0.04;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(0.001, now);
    this.output.gain.exponentialRampToValueAtTime(0.24, now + 0.25);
    this.schedule();
    this.intervalId = window.setInterval(() => this.schedule(), 80);
  }

  stop(): void {
    if (this.intervalId !== null) window.clearInterval(this.intervalId);
    this.intervalId = null;
    const now = this.context.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setTargetAtTime(0.001, now, 0.25);
  }

  private schedule(): void {
    const secondsPerStep = 60 / MENU_MUSIC_BPM / 4;
    const horizon = this.context.currentTime + 0.5;

    while (this.nextStepTime < horizon) {
      this.scheduleStep(this.step, this.nextStepTime);
      this.nextStepTime += secondsPerStep;
      this.step = (this.step + 1) % 32;
    }
  }

  private scheduleStep(step: number, time: number): void {
    for (const event of getMenuMusicEvents(step)) {
      if (event.kind === 'tone') {
        playTone(this.context, this.output, { ...event, when: time + (event.offset ?? 0) });
      } else {
        playNoise(this.context, this.output, { ...event, when: time + (event.offset ?? 0) });
      }
    }
  }
}

export type MenuMusicEvent = MenuToneEvent | MenuNoiseEvent;

interface MenuToneEvent extends ToneOptions {
  kind: 'tone';
  offset?: number;
}

interface MenuNoiseEvent extends NoiseOptions {
  kind: 'noise';
  offset?: number;
}

const MENU_MUSIC_BPM = 118;
const MENU_BASS = [82.41, 82.41, 98, 82.41, 123.47, 110, 98, 73.42];
const MENU_ARP = [
  329.63,
  415.3,
  493.88,
  659.25,
  554.37,
  493.88,
  415.3,
  369.99,
  329.63,
  415.3,
  493.88,
  740,
  659.25,
  554.37,
  493.88,
  415.3,
];
const MENU_HOOK = new Map<number, number>([
  [24, 659.25],
  [26, 830.61],
  [28, 880],
  [30, 987.77],
]);

export function getMenuMusicEvents(step: number): MenuMusicEvent[] {
  const normalizedStep = modulo(step, 32);
  const events: MenuMusicEvent[] = [];

  if (normalizedStep % 2 === 0) {
    events.push({
      kind: 'tone',
      frequency: MENU_BASS[(normalizedStep / 2) % MENU_BASS.length],
      duration: 0.18,
      gain: normalizedStep % 8 === 0 ? 0.09 : 0.065,
      type: 'square',
      attack: 0.002,
      release: 0.08,
      lowpass: 900,
    });
  }

  if (normalizedStep % 2 === 0) {
    events.push({
      kind: 'tone',
      frequency: MENU_ARP[(normalizedStep / 2) % MENU_ARP.length],
      duration: 0.08,
      gain: 0.042,
      type: 'square',
      attack: 0.001,
      release: 0.045,
      lowpass: 4200,
    });
  }

  if (normalizedStep % 4 === 0) {
    events.push({
      kind: 'noise',
      duration: 0.035,
      gain: normalizedStep % 8 === 0 ? 0.04 : 0.026,
      lowpass: 7600,
      highpass: 2400,
    });
  }

  const hookFrequency = MENU_HOOK.get(normalizedStep);
  if (hookFrequency) {
    events.push({
      kind: 'tone',
      frequency: hookFrequency,
      duration: 0.13,
      gain: 0.06,
      type: 'square',
      attack: 0.001,
      release: 0.07,
      lowpass: 5200,
    });
  }

  if (normalizedStep === 15 || normalizedStep === 31) {
    events.push({
      kind: 'tone',
      frequency: 1480,
      endFrequency: 740,
      duration: 0.16,
      gain: 0.035,
      type: 'sawtooth',
      attack: 0.001,
      release: 0.12,
      lowpass: 3600,
    });
  }

  return events;
}

interface ToneOptions {
  frequency: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  attack?: number;
  release?: number;
  when?: number;
  endFrequency?: number;
  lowpass?: number;
}

interface NoiseOptions {
  duration: number;
  gain: number;
  when?: number;
  lowpass?: number;
  highpass?: number;
}

function playUiSelect(context: AudioContext, destination: AudioNode): void {
  const now = context.currentTime;
  playTone(context, destination, {
    frequency: 640,
    endFrequency: 860,
    duration: 0.09,
    gain: 0.09,
    type: 'triangle',
    attack: 0.005,
    release: 0.05,
    when: now,
  });
}

function playLanding(context: AudioContext, destination: AudioNode): void {
  const now = context.currentTime;
  playTone(context, destination, {
    frequency: 330,
    duration: 0.4,
    gain: 0.08,
    type: 'sine',
    attack: 0.01,
    release: 0.25,
    when: now,
  });
  playTone(context, destination, {
    frequency: 495,
    duration: 0.55,
    gain: 0.06,
    type: 'triangle',
    attack: 0.03,
    release: 0.32,
    when: now + 0.12,
  });
}

function playCollision(context: AudioContext, destination: AudioNode): void {
  const now = context.currentTime;
  playNoise(context, destination, {
    duration: 0.16,
    gain: 0.18,
    when: now,
    lowpass: 1700,
    highpass: 120,
  });
  playTone(context, destination, {
    frequency: 96,
    endFrequency: 42,
    duration: 0.24,
    gain: 0.14,
    type: 'sine',
    attack: 0.002,
    release: 0.18,
    when: now,
  });
}

function playExplosion(context: AudioContext, destination: AudioNode): void {
  const now = context.currentTime + 0.04;
  playNoise(context, destination, {
    duration: 0.74,
    gain: 0.22,
    when: now,
    lowpass: 1300,
    highpass: 60,
  });
  playTone(context, destination, {
    frequency: 72,
    endFrequency: 28,
    duration: 0.82,
    gain: 0.18,
    type: 'sawtooth',
    attack: 0.004,
    release: 0.62,
    when: now,
    lowpass: 520,
  });

  for (let i = 0; i < 4; i++) {
    playTone(context, destination, {
      frequency: 520 + i * 170,
      endFrequency: 220 + i * 70,
      duration: 0.12 + i * 0.03,
      gain: 0.025,
      type: 'square',
      attack: 0.001,
      release: 0.1,
      when: now + i * 0.035,
      lowpass: 2200,
    });
  }
}

function playPowerUpGood(context: AudioContext, destination: AudioNode): void {
  const now = context.currentTime;
  [440, 660, 880].forEach((frequency, index) => {
    playTone(context, destination, {
      frequency,
      duration: 0.22,
      gain: 0.065,
      type: 'triangle',
      attack: 0.006,
      release: 0.16,
      when: now + index * 0.055,
    });
  });
}

function playPowerUpBad(context: AudioContext, destination: AudioNode): void {
  const now = context.currentTime;
  playTone(context, destination, {
    frequency: 210,
    endFrequency: 125,
    duration: 0.34,
    gain: 0.11,
    type: 'sawtooth',
    attack: 0.005,
    release: 0.24,
    when: now,
    lowpass: 900,
  });
  playNoise(context, destination, {
    duration: 0.22,
    gain: 0.06,
    when: now + 0.04,
    lowpass: 1200,
    highpass: 320,
  });
}

function playPause(context: AudioContext, destination: AudioNode): void {
  playTone(context, destination, {
    frequency: 300,
    endFrequency: 220,
    duration: 0.13,
    gain: 0.07,
    type: 'sine',
    attack: 0.005,
    release: 0.08,
  });
}

function playResume(context: AudioContext, destination: AudioNode): void {
  playTone(context, destination, {
    frequency: 260,
    endFrequency: 390,
    duration: 0.12,
    gain: 0.07,
    type: 'sine',
    attack: 0.005,
    release: 0.07,
  });
}

function playTone(context: AudioContext, destination: AudioNode, options: ToneOptions): void {
  const start = options.when ?? context.currentTime;
  const attack = options.attack ?? 0.008;
  const release = options.release ?? Math.min(0.2, options.duration * 0.6);
  const end = start + options.duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = options.lowpass ? context.createBiquadFilter() : null;

  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.frequency, start);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, options.endFrequency),
      end,
    );
  }

  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, options.gain), start + attack);
  gain.gain.setTargetAtTime(0.001, Math.max(start + attack, end - release), release / 3);

  if (filter) {
    filter.type = 'lowpass';
    filter.frequency.value = options.lowpass ?? 1200;
    oscillator.connect(filter);
    filter.connect(gain);
  } else {
    oscillator.connect(gain);
  }

  gain.connect(destination);
  oscillator.start(start);
  oscillator.stop(end + 0.05);
}

function playNoise(context: AudioContext, destination: AudioNode, options: NoiseOptions): void {
  const start = options.when ?? context.currentTime;
  const source = context.createBufferSource();
  const gain = context.createGain();
  const lowpass = context.createBiquadFilter();
  const highpass = context.createBiquadFilter();

  source.buffer = createNoiseBuffer(context, options.duration);
  lowpass.type = 'lowpass';
  lowpass.frequency.value = options.lowpass ?? 1400;
  highpass.type = 'highpass';
  highpass.frequency.value = options.highpass ?? 80;

  gain.gain.setValueAtTime(Math.max(0.001, options.gain), start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + options.duration);

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination);
  source.start(start);
  source.stop(start + options.duration);
}

function createNoiseBuffer(context: AudioContext, duration: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    channel[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  return buffer;
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
