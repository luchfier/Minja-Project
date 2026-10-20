import { ButtonSoundCategory, SoundEffectsSettings } from '../types/audio';
import {
  getSoundEffectsSettings,
  saveSoundEffectsSettings,
  DEFAULT_SFX_SETTINGS,
} from './audioStorage';

let audioCtx: AudioContext | null = null;
let sfxSettings: SoundEffectsSettings = { ...DEFAULT_SFX_SETTINGS };
let isInitialized = false;
let isMutedGlobally = false;

// Pre-allocated shared noise buffer (avoids GC pauses on rapid taps)
let sharedNoiseBuffer: AudioBuffer | null = null;

// Singleton Master Output Bus
interface MasterOutputBus {
  inputGain: GainNode;
  limiter: DynamicsCompressorNode;
  warmthFilter: BiquadFilterNode;
}
let masterBus: MasterOutputBus | null = null;

// Voice Choking & Stealing Manager:
// Tracks currently active voice gain nodes per group.
// When a new voice starts, existing voices in the same group are faded out in 4ms.
// This completely eliminates phase cancellation, wave doubling (+6dB spikes), and clipping.
const activeVoices: Map<string, GainNode[]> = new Map();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

function getMasterBus(ctx: AudioContext): GainNode {
  if (!masterBus) {
    const inputGain = ctx.createGain();
    inputGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Brickwall dynamics limiter: prevents audio summing from clipping past 0dBFS
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-6.0, ctx.currentTime);
    limiter.knee.setValueAtTime(8.0, ctx.currentTime);
    limiter.ratio.setValueAtTime(12.0, ctx.currentTime);
    limiter.attack.setValueAtTime(0.001, ctx.currentTime);
    limiter.release.setValueAtTime(0.06, ctx.currentTime);

    // Warm studio filter: eliminates harsh digital highs (>8kHz)
    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.setValueAtTime(8000, ctx.currentTime);
    warmthFilter.Q.setValueAtTime(0.7, ctx.currentTime);

    inputGain.connect(limiter);
    limiter.connect(warmthFilter);
    warmthFilter.connect(ctx.destination);

    masterBus = { inputGain, limiter, warmthFilter };
  }
  return masterBus.inputGain;
}

function getSharedNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!sharedNoiseBuffer || sharedNoiseBuffer.sampleRate !== ctx.sampleRate) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.5); // 500ms pre-rendered noise
    sharedNoiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = sharedNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.85;
    }
  }
  return sharedNoiseBuffer;
}

function chokeVoiceGroup(group: string, ctx: AudioContext): void {
  const gains = activeVoices.get(group);
  if (gains && gains.length > 0) {
    const now = ctx.currentTime;
    for (const g of gains) {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0.0001, now + 0.004);
      } catch {
        // Node might have already finished
      }
    }
    activeVoices.set(group, []);
  }
}

function registerVoice(group: string, gainNode: GainNode): void {
  let list = activeVoices.get(group);
  if (!list) {
    list = [];
    activeVoices.set(group, list);
  }
  list.push(gainNode);
  if (list.length > 4) {
    list.shift();
  }
}

export async function initSoundEffects(): Promise<void> {
  if (isInitialized) return;
  try {
    const loaded = await getSoundEffectsSettings();
    sfxSettings = loaded;
    isInitialized = true;
  } catch (e) {
    console.warn('Gagal memuat pengaturan SFX:', e);
  }
}

export function getSoundEffectsState(): SoundEffectsSettings {
  return { ...sfxSettings };
}

export async function updateSoundEffectsSettings(newSettings: Partial<SoundEffectsSettings>): Promise<void> {
  sfxSettings = { ...sfxSettings, ...newSettings };
  await saveSoundEffectsSettings(sfxSettings);
}

export function setSoundEffectsMuted(muted: boolean): void {
  isMutedGlobally = muted;
}

export function isSoundEffectsMuted(): boolean {
  return isMutedGlobally;
}

/**
 * Minja Studio Signature Acoustic Sound Engine:
 * Monophonic voice choked, master bus limited, calibrated for tactile touchscreen kiosks.
 */
export function playButtonSound(category: ButtonSoundCategory = 'primary'): void {
  if (isMutedGlobally || !sfxSettings.enabled || sfxSettings.volume <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Choke any existing button sounds to prevent phase cancellation & volume doubling
  chokeVoiceGroup('button', ctx);

  const voiceGain = ctx.createGain();
  const effectiveVol = Math.min(1, Math.max(0, sfxSettings.volume * 0.65));
  voiceGain.gain.setValueAtTime(effectiveVol, now);
  voiceGain.connect(getMasterBus(ctx));
  registerVoice('button', voiceGain);

  const noiseBuffer = getSharedNoiseBuffer(ctx);

  switch (category) {
    case 'primary': {
      // 🌟 Minja Signature Pop-Chime: Acoustic Champagne Bubble Pop + Glass Music-Box Chime
      // Layer 1: Organic tactile waterdrop/bubble pop
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(680, now);
      popOsc.frequency.exponentialRampToValueAtTime(360, now + 0.024);

      popGain.gain.setValueAtTime(0.001, now);
      popGain.gain.linearRampToValueAtTime(0.45, now + 0.002);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      popOsc.connect(popGain);
      popGain.connect(voiceGain);
      popOsc.start(now);
      popOsc.stop(now + 0.04);

      // Layer 2: Tactile felt mallet transient
      const tapNoise = ctx.createBufferSource();
      tapNoise.buffer = noiseBuffer;
      const tapFilter = ctx.createBiquadFilter();
      tapFilter.type = 'bandpass';
      tapFilter.frequency.setValueAtTime(1600, now);
      tapFilter.Q.setValueAtTime(2.5, now);
      const tapGain = ctx.createGain();
      tapGain.gain.setValueAtTime(0.18, now);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

      tapNoise.connect(tapFilter);
      tapFilter.connect(tapGain);
      tapGain.connect(voiceGain);
      tapNoise.start(now);

      // Layer 3: Warm harmonic glass bell chime (G5 ~ 784Hz + E6 ~ 1318Hz golden interval)
      const chime1 = ctx.createOscillator();
      const chimeGain1 = ctx.createGain();
      chime1.type = 'sine';
      chime1.frequency.setValueAtTime(783.99, now + 0.004);

      chimeGain1.gain.setValueAtTime(0.001, now + 0.004);
      chimeGain1.gain.linearRampToValueAtTime(0.5, now + 0.008);
      chimeGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      const chime2 = ctx.createOscillator();
      const chimeGain2 = ctx.createGain();
      chime2.type = 'triangle';
      chime2.frequency.setValueAtTime(1318.51, now + 0.004);

      chimeGain2.gain.setValueAtTime(0.001, now + 0.004);
      chimeGain2.gain.linearRampToValueAtTime(0.25, now + 0.008);
      chimeGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      chime1.connect(chimeGain1);
      chime2.connect(chimeGain2);
      chimeGain1.connect(voiceGain);
      chimeGain2.connect(voiceGain);

      chime1.start(now + 0.004);
      chime2.start(now + 0.004);
      chime1.stop(now + 0.15);
      chime2.stop(now + 0.12);
      break;
    }

    case 'secondary': {
      // 🔘 Analog Camera Dial / Shutter Wheel Notch (Pure ASMR "Snick")
      const notch1 = ctx.createBufferSource();
      notch1.buffer = noiseBuffer;
      const notch1Filter = ctx.createBiquadFilter();
      notch1Filter.type = 'bandpass';
      notch1Filter.frequency.setValueAtTime(3200, now);
      notch1Filter.Q.setValueAtTime(4.8, now);
      const notch1Gain = ctx.createGain();
      notch1Gain.gain.setValueAtTime(0.4, now);
      notch1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);

      notch1.connect(notch1Filter);
      notch1Filter.connect(notch1Gain);
      notch1Gain.connect(voiceGain);
      notch1.start(now);

      // Spring ball detent settle (+4ms)
      const notch2 = ctx.createBufferSource();
      notch2.buffer = noiseBuffer;
      const notch2Filter = ctx.createBiquadFilter();
      notch2Filter.type = 'bandpass';
      notch2Filter.frequency.setValueAtTime(4600, now + 0.004);
      notch2Filter.Q.setValueAtTime(5.2, now + 0.004);
      const notch2Gain = ctx.createGain();
      notch2Gain.gain.setValueAtTime(0.001, now);
      notch2Gain.gain.setValueAtTime(0.28, now + 0.004);
      notch2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

      notch2.connect(notch2Filter);
      notch2Filter.connect(notch2Gain);
      notch2Gain.connect(voiceGain);
      notch2.start(now + 0.004);

      // Warm wooden camera body thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(380, now);

      thudGain.gain.setValueAtTime(0.001, now);
      thudGain.gain.linearRampToValueAtTime(0.35, now + 0.002);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      thud.connect(thudGain);
      thudGain.connect(voiceGain);
      thud.start(now);
      thud.stop(now + 0.022);
      break;
    }

    case 'navigation': {
      // ↩️ Velvet Felt Tap: Gentle, muted, reassuring acoustic step
      const tapOsc = ctx.createOscillator();
      const tapFilter = ctx.createBiquadFilter();
      const tapGain = ctx.createGain();

      tapOsc.type = 'sine';
      tapOsc.frequency.setValueAtTime(260, now);

      tapFilter.type = 'lowpass';
      tapFilter.frequency.setValueAtTime(420, now);

      tapGain.gain.setValueAtTime(0.001, now);
      tapGain.gain.linearRampToValueAtTime(0.5, now + 0.004);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      tapOsc.connect(tapFilter);
      tapFilter.connect(tapGain);
      tapGain.connect(voiceGain);

      tapOsc.start(now);
      tapOsc.stop(now + 0.055);
      break;
    }

    case 'delete': {
      // 🗑️ Polaroid Film Whisper: Paper slide friction + subtle release
      const slide = ctx.createBufferSource();
      slide.buffer = noiseBuffer;
      const slideFilter = ctx.createBiquadFilter();
      slideFilter.type = 'bandpass';
      slideFilter.frequency.setValueAtTime(2400, now);
      slideFilter.frequency.exponentialRampToValueAtTime(1300, now + 0.032);
      slideFilter.Q.setValueAtTime(2.2, now);

      const slideGain = ctx.createGain();
      slideGain.gain.setValueAtTime(0.22, now);
      slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

      slide.connect(slideFilter);
      slideFilter.connect(slideGain);
      slideGain.connect(voiceGain);
      slide.start(now);

      const releaseOsc = ctx.createOscillator();
      const releaseGain = ctx.createGain();
      releaseOsc.type = 'sine';
      releaseOsc.frequency.setValueAtTime(220, now + 0.012);

      releaseGain.gain.setValueAtTime(0.001, now + 0.012);
      releaseGain.gain.linearRampToValueAtTime(0.25, now + 0.016);
      releaseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      releaseOsc.connect(releaseGain);
      releaseGain.connect(voiceGain);
      releaseOsc.start(now + 0.012);
      releaseOsc.stop(now + 0.055);
      break;
    }

    case 'counter': {
      // 🔢 Pentatonic Marimba Key Pluck (Warm resonant wooden chime for + / - prints)
      const marimba = ctx.createOscillator();
      const marimbaOvertone = ctx.createOscillator();
      const marimbaGain = ctx.createGain();
      const overtoneGain = ctx.createGain();
      const marimbaFilter = ctx.createBiquadFilter();

      marimbaFilter.type = 'lowpass';
      marimbaFilter.frequency.setValueAtTime(2800, now);

      // Fundamental warm bar (A5 = 880Hz)
      marimba.type = 'triangle';
      marimba.frequency.setValueAtTime(880, now);

      marimbaGain.gain.setValueAtTime(0.001, now);
      marimbaGain.gain.linearRampToValueAtTime(0.55, now + 0.003);
      marimbaGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      // Natural wooden overtone (2nd harmonic = 1760Hz)
      marimbaOvertone.type = 'sine';
      marimbaOvertone.frequency.setValueAtTime(1760, now);

      overtoneGain.gain.setValueAtTime(0.001, now);
      overtoneGain.gain.linearRampToValueAtTime(0.18, now + 0.002);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      marimba.connect(marimbaFilter);
      marimbaOvertone.connect(marimbaFilter);
      marimbaFilter.connect(marimbaGain);
      marimbaGain.connect(voiceGain);
      overtoneGain.connect(voiceGain);

      marimba.start(now);
      marimbaOvertone.start(now);
      marimba.stop(now + 0.11);
      marimbaOvertone.stop(now + 0.05);
      break;
    }

    case 'success': {
      // ✨ Minja Signature Memory Chime: Luxurious Major 9th Arpeggio (F5 -> A5 -> C6 -> E6)
      const notes = [
        { freq: 698.46, time: 0.000, dur: 0.28, vol: 0.42 }, // F5
        { freq: 880.00, time: 0.055, dur: 0.30, vol: 0.46 }, // A5
        { freq: 1046.50, time: 0.110, dur: 0.34, vol: 0.50 }, // C6
        { freq: 1318.51, time: 0.165, dur: 0.44, vol: 0.38 }, // E6 (Sparkle finish)
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(n.freq * 2, now + n.time);

        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0.001, now + n.time);
        noteGain.gain.linearRampToValueAtTime(n.vol, now + n.time + 0.006);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(0.001, now + n.time);
        overtoneGain.gain.linearRampToValueAtTime(n.vol * 0.25, now + n.time + 0.004);
        overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur * 0.4);

        osc.connect(noteGain);
        overtone.connect(overtoneGain);
        noteGain.connect(voiceGain);
        overtoneGain.connect(voiceGain);

        osc.start(now + n.time);
        overtone.start(now + n.time);
        osc.stop(now + n.time + n.dur + 0.01);
        overtone.stop(now + n.time + n.dur * 0.45);
      });

      // Warm vintage Rhodes sub-bass body (F3 ~ 174.61Hz)
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(174.61, now);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.32, now + 0.01);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      sub.connect(subGain);
      subGain.connect(voiceGain);
      sub.start(now);
      sub.stop(now + 0.4);
      break;
    }
  }
}

/**
 * Play a melodic, anticipatory countdown chime (3, 2, 1) before photo capture.
 * Tuned to ascending studio chimes:
 * - 3: E5 (659Hz) - Attention & pose ready
 * - 2: G5 (784Hz) - Anticipation
 * - 1: B5 (988Hz) - Peak ready / "Smile!" with celestial sparkle
 */
export function playCountdownTick(count: number): void {
  if (isMutedGlobally || !sfxSettings.enabled || sfxSettings.volume <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  chokeVoiceGroup('countdown', ctx);

  const voiceGain = ctx.createGain();
  const effectiveVol = Math.min(1, Math.max(0, sfxSettings.volume * 0.7));
  voiceGain.gain.setValueAtTime(effectiveVol, now);
  voiceGain.connect(getMasterBus(ctx));
  registerVoice('countdown', voiceGain);

  let freq = 659.25; // E5 for 3
  let overtoneFreq = 1318.51;
  let decaySec = 0.12;

  if (count === 2) {
    freq = 783.99; // G5 for 2
    overtoneFreq = 1567.98;
    decaySec = 0.13;
  } else if (count === 1) {
    freq = 987.77; // B5 for 1
    overtoneFreq = 1975.53; // B6 sparkle
    decaySec = 0.18;
  }

  // Pure fundamental bell
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);

  oscGain.gain.setValueAtTime(0.001, now);
  oscGain.gain.linearRampToValueAtTime(0.55, now + 0.003);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + decaySec);

  // Crystal overtone
  const overtone = ctx.createOscillator();
  const overtoneGain = ctx.createGain();
  overtone.type = 'triangle';
  overtone.frequency.setValueAtTime(overtoneFreq, now);

  overtoneGain.gain.setValueAtTime(0.001, now);
  overtoneGain.gain.linearRampToValueAtTime(count === 1 ? 0.35 : 0.2, now + 0.003);
  overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + decaySec * 0.6);

  // Acoustic wooden mallet transient
  const tap = ctx.createOscillator();
  const tapGain = ctx.createGain();
  tap.type = 'triangle';
  tap.frequency.setValueAtTime(freq * 0.5, now);

  tapGain.gain.setValueAtTime(0.001, now);
  tapGain.gain.linearRampToValueAtTime(0.3, now + 0.001);
  tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

  osc.connect(oscGain);
  overtone.connect(overtoneGain);
  tap.connect(tapGain);

  oscGain.connect(voiceGain);
  overtoneGain.connect(voiceGain);
  tapGain.connect(voiceGain);

  osc.start(now);
  overtone.start(now);
  tap.start(now);

  osc.stop(now + decaySec + 0.01);
  overtone.stop(now + decaySec + 0.01);
  tap.stop(now + 0.02);
}

/**
 * Play a bright, joyful two-tone crystal chime when the countdown hits '1' / 'SMILE!'
 * to prompt the subjects to look at the lens and smile.
 */
export function playSmileCueSound(): void {
  if (isMutedGlobally || !sfxSettings.enabled || sfxSettings.volume <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  chokeVoiceGroup('smileCue', ctx);

  const voiceGain = ctx.createGain();
  const effectiveVol = Math.min(1, Math.max(0, sfxSettings.volume * 0.75));
  voiceGain.gain.setValueAtTime(effectiveVol, now);
  voiceGain.connect(getMasterBus(ctx));
  registerVoice('smileCue', voiceGain);

  // Tone 1: C6 (1046.5Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1046.5, now);

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.5, now + 0.004);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc1.connect(gain1);
  gain1.connect(voiceGain);
  osc1.start(now);
  osc1.stop(now + 0.16);

  // Tone 2: E6 (1318.5Hz) - 40ms later with shimmer
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(1318.5, now + 0.04);

  gain2.gain.setValueAtTime(0.001, now + 0.04);
  gain2.gain.linearRampToValueAtTime(0.6, now + 0.044);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc2.connect(gain2);
  gain2.connect(voiceGain);
  osc2.start(now + 0.04);
  osc2.stop(now + 0.23);
}

/**
 * Authentic DSLR / Studio Camera Mechanical Shutter:
 * High-fidelity physical modeling of mirror lift, focal-plane curtain snap,
 * mirror return slam, and subtle stepper motor advance.
 */
export function playCameraShutterSound(): void {
  if (isMutedGlobally || !sfxSettings.enabled || sfxSettings.volume <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  chokeVoiceGroup('shutter', ctx);

  const voiceGain = ctx.createGain();
  const effectiveVol = Math.min(1, Math.max(0, sfxSettings.volume * 0.9));
  voiceGain.gain.setValueAtTime(effectiveVol, now);
  voiceGain.connect(getMasterBus(ctx));
  registerVoice('shutter', voiceGain);

  const noiseBuffer = getSharedNoiseBuffer(ctx);

  // 1. FRONT CURTAIN & MIRROR LIFT (0ms - 15ms)
  const frontNoise = ctx.createBufferSource();
  frontNoise.buffer = noiseBuffer;
  const frontFilter = ctx.createBiquadFilter();
  frontFilter.type = 'bandpass';
  frontFilter.frequency.setValueAtTime(4200, now);
  frontFilter.Q.setValueAtTime(4.0, now);

  const frontGain = ctx.createGain();
  frontGain.gain.setValueAtTime(0.55, now);
  frontGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

  frontNoise.connect(frontFilter);
  frontFilter.connect(frontGain);
  frontGain.connect(voiceGain);
  frontNoise.start(now);

  // Spring blade click
  const springOsc = ctx.createOscillator();
  const springGain = ctx.createGain();
  springOsc.type = 'triangle';
  springOsc.frequency.setValueAtTime(1600, now);
  springOsc.frequency.exponentialRampToValueAtTime(700, now + 0.012);

  springGain.gain.setValueAtTime(0.001, now);
  springGain.gain.linearRampToValueAtTime(0.4, now + 0.002);
  springGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

  springOsc.connect(springGain);
  springGain.connect(voiceGain);
  springOsc.start(now);
  springOsc.stop(now + 0.014);

  // 2. REAR CURTAIN CLOSE & MIRROR RETURN SLAM (52ms - 95ms)
  const rearTime = now + 0.052;

  const rearNoise = ctx.createBufferSource();
  rearNoise.buffer = noiseBuffer;
  const rearFilter = ctx.createBiquadFilter();
  rearFilter.type = 'bandpass';
  rearFilter.frequency.setValueAtTime(3100, rearTime);
  rearFilter.Q.setValueAtTime(3.8, rearTime);

  const rearGain = ctx.createGain();
  rearGain.gain.setValueAtTime(0.001, now);
  rearGain.gain.setValueAtTime(0.65, rearTime);
  rearGain.gain.exponentialRampToValueAtTime(0.001, rearTime + 0.02);

  rearNoise.connect(rearFilter);
  rearFilter.connect(rearGain);
  rearGain.connect(voiceGain);
  rearNoise.start(rearTime);

  // Heavy mirror box thud
  const thudOsc = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thudOsc.type = 'sine';
  thudOsc.frequency.setValueAtTime(260, rearTime);
  thudOsc.frequency.exponentialRampToValueAtTime(120, rearTime + 0.035);

  thudGain.gain.setValueAtTime(0.001, now);
  thudGain.gain.setValueAtTime(0.001, rearTime);
  thudGain.gain.linearRampToValueAtTime(0.5, rearTime + 0.003);
  thudGain.gain.exponentialRampToValueAtTime(0.001, rearTime + 0.04);

  thudOsc.connect(thudGain);
  thudGain.connect(voiceGain);
  thudOsc.start(rearTime);
  thudOsc.stop(rearTime + 0.045);

  // 3. SUBTLE MOTOR ADVANCE / SENSOR READY (90ms - 170ms)
  const motorTime = now + 0.09;
  const motorOsc = ctx.createOscillator();
  const motorGain = ctx.createGain();
  const motorFilter = ctx.createBiquadFilter();

  motorFilter.type = 'lowpass';
  motorFilter.frequency.setValueAtTime(1200, motorTime);

  motorOsc.type = 'triangle';
  motorOsc.frequency.setValueAtTime(840, motorTime);
  motorOsc.frequency.exponentialRampToValueAtTime(420, motorTime + 0.07);

  motorGain.gain.setValueAtTime(0.001, now);
  motorGain.gain.setValueAtTime(0.001, motorTime);
  motorGain.gain.linearRampToValueAtTime(0.12, motorTime + 0.01);
  motorGain.gain.exponentialRampToValueAtTime(0.001, motorTime + 0.075);

  motorOsc.connect(motorFilter);
  motorFilter.connect(motorGain);
  motorGain.connect(voiceGain);

  motorOsc.start(motorTime);
  motorOsc.stop(motorTime + 0.08);
}

/**
 * Play a sweet, pleasant confirmation sound when a captured photo is saved to the gallery.
 */
export function playPhotoCapturedSound(): void {
  if (isMutedGlobally || !sfxSettings.enabled || sfxSettings.volume <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  chokeVoiceGroup('captured', ctx);

  const voiceGain = ctx.createGain();
  const effectiveVol = Math.min(1, Math.max(0, sfxSettings.volume * 0.55));
  voiceGain.gain.setValueAtTime(effectiveVol, now);
  voiceGain.connect(getMasterBus(ctx));
  registerVoice('captured', voiceGain);

  // Note 1: G5 (784Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(783.99, now);

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.4, now + 0.004);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc1.connect(gain1);
  gain1.connect(voiceGain);
  osc1.start(now);
  osc1.stop(now + 0.13);

  // Note 2: C6 (1046.5Hz)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1046.5, now + 0.06);

  gain2.gain.setValueAtTime(0.001, now + 0.06);
  gain2.gain.linearRampToValueAtTime(0.5, now + 0.066);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc2.connect(gain2);
  gain2.connect(voiceGain);
  osc2.start(now + 0.06);
  osc2.stop(now + 0.24);
}
