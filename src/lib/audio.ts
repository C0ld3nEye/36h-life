// Web Audio Manager with iOS Safari / Android Chrome Auto-Unlock & Procedural Synthesis
import { CyclePhaseKey } from '../types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private currentPhase: CyclePhaseKey | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.attachUnlockListeners();
    }
  }

  private attachUnlockListeners() {
    const unlockHandler = () => {
      this.unlockAudioContext();
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('click', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { once: true, passive: true });
    window.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
    window.addEventListener('click', unlockHandler, { once: true, passive: true });
  }

  /**
   * Explicitly initializes and resumes AudioContext on user interaction
   */
  public async unlockAudioContext(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return false;
        this.ctx = new AudioContextClass();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.isUnlocked = this.ctx.state === 'running';
      return this.isUnlocked;
    } catch (err) {
      console.debug("AudioContext unlock attempt:", err);
      return false;
    }
  }

  public getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      } catch (_) {}
    }
    return this.ctx;
  }

  /**
   * Subtle UI Click sound (crisp, quiet)
   */
  public playClickSound() {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (_) {}
  }

  /**
   * Action Confirmation chime (harmonic ascending chord)
   */
  public playActionConfirmSound() {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + (index * 0.05);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.05, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch (_) {}
  }

  /**
   * Notification / Message chime
   */
  public playNotificationChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    
    // Attempt resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      
      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Tone 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.1);
      gain2.gain.setValueAtTime(0.10, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.6);
    } catch (_) {}
  }

  /**
   * Mindset-dependent harmonic tone (comforting vs alerting)
   */
  public playMindsetTone(mindset: number) {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Lower/minor frequency for low mindset (stress), warm fifth for high mindset
      const baseFreq = mindset < 30 ? 220 : mindset < 70 ? 329.63 : 440;
      osc.type = mindset < 30 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (_) {}
  }

  /**
   * Subtle atmospheric background soundscape according to 36h cycle phase
   */
  public updateAtmosphereAmbience(phase: CyclePhaseKey, enabled: boolean = false) {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running' || !enabled) {
      this.stopAtmosphereAmbience();
      return;
    }

    if (this.currentPhase === phase && this.ambientOsc) return;
    this.stopAtmosphereAmbience();
    this.currentPhase = phase;

    try {
      const phaseFreqs: Record<CyclePhaseKey, number> = {
        aube: 130.81,      // C3 (Fresh)
        matin: 146.83,     // D3 (Active)
        zenith: 164.81,    // E3 (Bright)
        apres_midi: 174.61,// F3 (Warm)
        crepuscule: 130.81,// C3 (Deep)
        nuit: 110.00       // A2 (Quiet)
      };

      const freq = phaseFreqs[phase] || 130.81;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 2.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      this.ambientOsc = osc;
      this.ambientGain = gain;
    } catch (_) {}
  }

  public stopAtmosphereAmbience() {
    if (this.ambientOsc && this.ctx) {
      try {
        if (this.ambientGain) {
          this.ambientGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0);
        }
        setTimeout(() => {
          try {
            this.ambientOsc?.stop();
            this.ambientOsc?.disconnect();
            this.ambientOsc = null;
            this.ambientGain = null;
          } catch (_) {}
        }, 1100);
      } catch (_) {
        this.ambientOsc = null;
        this.ambientGain = null;
      }
    }
  }
}

export const soundEngine = new SoundEngine();
