/**
 * Motor de audio con Web Audio nativa.
 *
 * voces → cadena del preset → bus → volumen de la mano → delay con
 * realimentación → reverb (sala «room» o «hall», impulsos procedurales) →
 * limitador → mute/pánico → salida
 *
 * Las voces y la cadena se crean una vez por preset y se reutilizan; nunca se
 * crean nodos por frame.
 */
import { planVoices } from './allocate';
import { PresetChain } from './chain';
import { generateImpulse, type ImpulseOptions } from './impulse';
import { PRESETS, type PresetDef, type PresetId } from './presets';
import { Voice, holdAt, type VoiceResources } from './voice';
import { generateNoise, pulseCoefficients, type NoiseColor } from './waves';

export interface EngineOptions {
  readonly preset: PresetId;
  readonly reverb: number;
  readonly delay: number;
  /** Notas máximas de un acorde de la rueda (sin contar el bajo). */
  readonly maxChordNotes: number;
}

const DELAY_TIME = 0.35;
const DELAY_FEEDBACK = 0.38;
/** Voces de repuesto para los crossfades (la vieja suelta mientras la nueva ataca). */
const SPARE_VOICES = 3;
/** Saltos de hasta una tercera mayor se deslizan; más grandes, crossfade. */
const MAX_GLIDE_SEMITONES = 4;

export class AudioEngine {
  readonly ctx: BaseAudioContext;
  private readonly voiceBus: GainNode;
  private readonly expression: GainNode;
  private readonly delaySend: GainNode;
  private readonly delayFeedback: GainNode;
  private readonly dry: GainNode;
  private readonly reverbSend: GainNode;
  private readonly output: GainNode;
  private readonly analyser: AnalyserNode;
  private readonly vibratoLfo: OscillatorNode;
  private readonly vibratoDepth: GainNode;
  private readonly meterBuffer: Float32Array<ArrayBuffer>;
  private readonly poolSize: number;
  private readonly roomSend: GainNode;
  private readonly hallSend: GainNode;
  private readonly pulseWaves = new Map<number, PeriodicWave>();
  private readonly noiseBuffers = new Map<NoiseColor, AudioBuffer>();
  private chain: PresetChain | null = null;

  private preset: PresetDef;
  private voices: Voice[] = [];
  private chord: { readonly bass: number; readonly notes: readonly number[] } | null = null;
  private volume = -1;
  private muted = false;
  private panicked = false;

  /** @param ctx contexto a usar; por defecto uno en tiempo real (en pruebas, un OfflineAudioContext). */
  constructor(opts: EngineOptions, ctx: BaseAudioContext = new AudioContext({ latencyHint: 'interactive' })) {
    this.ctx = ctx;
    this.preset = PRESETS[opts.preset];
    this.poolSize = opts.maxChordNotes + 1 + SPARE_VOICES;

    this.voiceBus = new GainNode(ctx, { gain: 1 });
    this.expression = new GainNode(ctx, { gain: 0 });
    this.voiceBus.connect(this.expression);

    // Delay: la señal seca pasa directa y los ecos se van oscureciendo.
    const preReverb = new GainNode(ctx, { gain: 1 });
    this.expression.connect(preReverb);
    this.delaySend = new GainNode(ctx, { gain: 0 });
    const delay = new DelayNode(ctx, { delayTime: DELAY_TIME, maxDelayTime: 1 });
    const echoTone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 3200, Q: 0.3 });
    this.delayFeedback = new GainNode(ctx, { gain: DELAY_FEEDBACK });
    this.expression.connect(this.delaySend).connect(delay).connect(echoTone);
    echoTone.connect(this.delayFeedback).connect(delay);
    echoTone.connect(preReverb);

    // Reverb por convolución con dos salas generadas por código; el preset elige cuál.
    this.dry = new GainNode(ctx, { gain: 1 });
    this.reverbSend = new GainNode(ctx, { gain: 0 });
    this.roomSend = new GainNode(ctx, { gain: 1 });
    this.hallSend = new GainNode(ctx, { gain: 0 });
    const room = this.makeConvolver({ seconds: 2.8, decay: 3.2 });
    const hall = this.makeConvolver({ seconds: 6, decay: 2.4, preDelay: 0.03 });
    preReverb.connect(this.dry);
    preReverb.connect(this.reverbSend);
    this.reverbSend.connect(this.roomSend).connect(room);
    this.reverbSend.connect(this.hallSend).connect(hall);

    // Limitador: compresor con ratio alto y ataque rápido.
    const limiter = new DynamicsCompressorNode(ctx, { threshold: -6, knee: 0, ratio: 20, attack: 0.002, release: 0.2 });
    this.dry.connect(limiter);
    room.connect(limiter);
    hall.connect(limiter);

    this.output = new GainNode(ctx, { gain: 1 });
    this.analyser = new AnalyserNode(ctx, { fftSize: 1024, smoothingTimeConstant: 0 });
    this.meterBuffer = new Float32Array(this.analyser.fftSize);
    limiter.connect(this.output).connect(ctx.destination);
    this.output.connect(this.analyser);

    // Vibrato compartido por todas las voces (lo usan Strings y Organ).
    this.vibratoLfo = new OscillatorNode(ctx, { type: 'sine', frequency: 5 });
    this.vibratoDepth = new GainNode(ctx, { gain: 0 });
    this.vibratoLfo.connect(this.vibratoDepth);
    this.vibratoLfo.start();

    this.setReverb(opts.reverb);
    this.setDelay(opts.delay);
    this.buildVoices();
  }

  /** Reanuda el contexto: hay que llamarlo dentro de un gesto del usuario. */
  resume(): Promise<void> {
    return this.ctx instanceof AudioContext ? this.ctx.resume() : Promise.resolve();
  }

  get presetId(): PresetId {
    return this.preset.id;
  }

  /** Hace sonar un acorde; las notas comunes con el anterior siguen sin re-atacar. */
  setChord(bass: number, notes: readonly number[]): void {
    const t = this.ctx.currentTime;
    if (this.panicked) {
      this.panicked = false;
      this.applyOutputGain(t);
    }
    const target = [bass, ...notes];
    const byRelease = this.voices.map((v, i) => [v.releasedAt, i] as const).sort((a, b) => a[0] - b[0]);
    const idleRank: number[] = [];
    byRelease.forEach(([, i], rank) => (idleRank[i] = rank));
    const steps = planVoices(
      this.voices.map((v) => v.note),
      target,
      { maxGlide: MAX_GLIDE_SEMITONES, idleRank },
    );
    steps.forEach((step, i) => {
      const voice = this.voices[i]!;
      switch (step.kind) {
        case 'keep':
          voice.setLevel(this.levelFor(step.note, bass), t);
          break;
        case 'glide':
          voice.glide(step.note, t, this.levelFor(step.note, bass));
          break;
        case 'attack':
          voice.attack(step.note, t, this.levelFor(step.note, bass));
          break;
        case 'release':
          voice.release(t);
          break;
        case 'idle':
          break;
      }
    });
    this.chord = { bass, notes };
  }

  /** Release suave de todas las voces. */
  release(): void {
    const t = this.ctx.currentTime;
    for (const v of this.voices) v.release(t);
    this.chord = null;
  }

  /** Volumen de la mano, 0..1, suavizado unos 30 ms. */
  setVolume(volume: number): void {
    const v = Math.min(1, Math.max(0, volume));
    if (Math.abs(v - this.volume) < 0.002) return;
    this.volume = v;
    const t = this.ctx.currentTime;
    const g = this.expression.gain;
    holdAt(g, t);
    // Curva cuadrática: más natural al oído que una lineal. τ = 10 ms ≈ 30 ms al 95 %.
    g.setTargetAtTime(v * v, t, 0.01);
  }

  setPreset(id: PresetId): void {
    if (id === this.preset.id) return;
    this.preset = PRESETS[id];
    this.buildVoices();
  }

  setReverb(mix: number): void {
    const m = Math.min(1, Math.max(0, mix));
    const t = this.ctx.currentTime;
    this.dry.gain.setTargetAtTime(1 - 0.4 * m, t, 0.05);
    this.reverbSend.gain.setTargetAtTime(0.9 * m, t, 0.05);
  }

  setDelay(mix: number): void {
    const m = Math.min(1, Math.max(0, mix));
    this.delaySend.gain.setTargetAtTime(0.7 * m, this.ctx.currentTime, 0.05);
  }

  /** Silencio inmediato: voces, ecos y salida. Vuelve a sonar con el siguiente acorde. */
  panic(): void {
    const t = this.ctx.currentTime;
    this.panicked = true;
    this.applyOutputGain(t, 0.004);
    for (const v of this.voices) v.release(t, true);
    this.chord = null;
    // Sin realimentación un momento para vaciar la línea de delay.
    const fb = this.delayFeedback.gain;
    holdAt(fb, t);
    fb.setTargetAtTime(0, t, 0.01);
    fb.setTargetAtTime(DELAY_FEEDBACK, t + 1, 0.05);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.applyOutputGain(this.ctx.currentTime);
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Nivel de salida 0..1 (escala de -60 a 0 dBFS), para el medidor. */
  meterLevel(): number {
    this.analyser.getFloatTimeDomainData(this.meterBuffer);
    let sum = 0;
    for (const s of this.meterBuffer) sum += s * s;
    const rms = Math.sqrt(sum / this.meterBuffer.length);
    const db = 20 * Math.log10(rms + 1e-9);
    return Math.min(1, Math.max(0, (db + 60) / 60));
  }

  /**
   * Crea la cadena y el pool de voces del preset actual. La cadena y las voces
   * viejas hacen un fundido; si suena un acorde, pasa a las voces nuevas.
   */
  private buildVoices(): void {
    const t = this.ctx.currentTime;
    const preset = this.preset;
    for (const v of this.voices) v.dispose(t);
    this.chain?.dispose(t);
    const chain = new PresetChain(this.ctx, preset, this.voiceBus);
    this.chain = chain;

    const vibrato = preset.vibrato;
    this.vibratoLfo.frequency.setTargetAtTime(vibrato?.rate ?? 5, t, 0.05);
    this.vibratoDepth.gain.setTargetAtTime(vibrato?.depthCents ?? 0, t, 0.05);
    const hall = preset.space === 'hall';
    this.roomSend.gain.setTargetAtTime(hall ? 0 : 1, t, 0.3);
    this.hallSend.gain.setTargetAtTime(hall ? 1 : 0, t, 0.3);

    const resources = this.voiceResources(chain.filterLfo);
    this.voices = Array.from(
      { length: this.poolSize },
      () => new Voice(this.ctx, preset, chain.input, this.vibratoDepth, resources),
    );
    const chord = this.chord;
    this.chord = null;
    if (chord) this.setChord(chord.bass, chord.notes);
  }

  private makeConvolver(opts: ImpulseOptions): ConvolverNode {
    const [left, right] = generateImpulse(this.ctx.sampleRate, opts);
    const impulse = this.ctx.createBuffer(2, left.length, this.ctx.sampleRate);
    impulse.copyToChannel(left, 0);
    impulse.copyToChannel(right, 1);
    return new ConvolverNode(this.ctx, { buffer: impulse });
  }

  /** Ondas de pulso y buffers de ruido se crean una sola vez y se comparten entre voces y presets. */
  private voiceResources(filterLfo: AudioNode | null): VoiceResources {
    return {
      filterLfo,
      pulseWave: (width) => {
        let wave = this.pulseWaves.get(width);
        if (!wave) {
          const { real, imag } = pulseCoefficients(width);
          wave = this.ctx.createPeriodicWave(real, imag);
          this.pulseWaves.set(width, wave);
        }
        return wave;
      },
      noiseBuffer: (color) => {
        let buffer = this.noiseBuffers.get(color);
        if (!buffer) {
          const length = this.ctx.sampleRate * 2;
          buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
          buffer.copyToChannel(generateNoise(length, color), 0);
          this.noiseBuffers.set(color, buffer);
        }
        return buffer;
      },
    };
  }

  private levelFor(note: number, bass: number): number {
    return note === bass ? this.preset.bassLevel : this.preset.level;
  }

  private applyOutputGain(t: number, tau = 0.01): void {
    const g = this.output.gain;
    holdAt(g, t);
    g.setTargetAtTime(this.muted || this.panicked ? 0 : 1, t, tau);
  }
}
