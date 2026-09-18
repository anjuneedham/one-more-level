import { Save } from './storage';

export type SoundName =
  | 'click'
  | 'start'
  | 'tick'
  | 'success'
  | 'fail'
  | 'levelup'
  | 'coin'
  | 'whoosh';

interface ToneStep {
  freq: number;
  /** Seconds from the start of the sound. */
  at: number;
  dur: number;
  type: OscillatorType;
  gain: number;
}

/**
 * All sound effects are synthesised with the Web Audio API - no audio files to
 * download, no third-party samples to license, a few hundred bytes of code.
 * Swap `SOUNDS` for buffer playback later without touching call sites.
 */
const SOUNDS: Record<SoundName, ToneStep[]> = {
  click: [{ freq: 660, at: 0, dur: 0.05, type: 'triangle', gain: 0.18 }],
  start: [
    { freq: 520, at: 0, dur: 0.08, type: 'triangle', gain: 0.2 },
    { freq: 780, at: 0.08, dur: 0.1, type: 'triangle', gain: 0.2 },
  ],
  tick: [{ freq: 880, at: 0, dur: 0.035, type: 'square', gain: 0.09 }],
  success: [
    { freq: 660, at: 0, dur: 0.09, type: 'triangle', gain: 0.22 },
    { freq: 880, at: 0.07, dur: 0.09, type: 'triangle', gain: 0.22 },
    { freq: 1170, at: 0.14, dur: 0.16, type: 'triangle', gain: 0.2 },
  ],
  fail: [
    { freq: 320, at: 0, dur: 0.13, type: 'sawtooth', gain: 0.16 },
    { freq: 190, at: 0.1, dur: 0.22, type: 'sawtooth', gain: 0.14 },
  ],
  levelup: [
    { freq: 523, at: 0, dur: 0.08, type: 'square', gain: 0.15 },
    { freq: 659, at: 0.07, dur: 0.08, type: 'square', gain: 0.15 },
    { freq: 784, at: 0.14, dur: 0.08, type: 'square', gain: 0.15 },
    { freq: 1046, at: 0.21, dur: 0.2, type: 'square', gain: 0.16 },
  ],
  coin: [
    { freq: 988, at: 0, dur: 0.05, type: 'square', gain: 0.14 },
    { freq: 1318, at: 0.05, dur: 0.12, type: 'square', gain: 0.14 },
  ],
  whoosh: [{ freq: 240, at: 0, dur: 0.16, type: 'sine', gain: 0.12 }],
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = Save.get().soundEnabled;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    Save.update({ soundEnabled: enabled });
    if (enabled) void this.resume();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Must be called from a user gesture on mobile browsers. */
  async resume(): Promise<void> {
    try {
      const ctx = this.ensureContext();
      if (ctx && ctx.state === 'suspended') await ctx.resume();
    } catch {
      // Audio is a nicety; never let it break the game.
    }
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const master = this.master;
    if (!ctx || !master || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    for (const step of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = step.type;
      osc.frequency.setValueAtTime(step.freq, now + step.at);
      // Short attack, exponential release: percussive and cheap.
      gain.gain.setValueAtTime(0.0001, now + step.at);
      gain.gain.exponentialRampToValueAtTime(step.gain, now + step.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + step.at + step.dur);
      osc.connect(gain).connect(master);
      osc.start(now + step.at);
      osc.stop(now + step.at + step.dur + 0.02);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }
}

export const Audio = new AudioManager();
