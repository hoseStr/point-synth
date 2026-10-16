/**
 * Una voz del sintetizador: 2–3 osciladores desafinados → filtro pasa-bajos con
 * envolvente → VCA con ADSR → nivel. Los osciladores arrancan una vez y no se
 * detienen nunca (salvo al cambiar de preset); el silencio es la envolvente en 0.
 */
import { midiToFrequency } from '../music/theory';
import type { PresetDef } from './presets';

/**
 * Congela el parámetro en su valor actual en `t`, para que la siguiente rampa
 * arranque desde ahí y nunca haya saltos (clics).
 */
export function holdAt(param: AudioParam, t: number): void {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(t);
  } else {
    const value = param.value;
    param.cancelScheduledValues(t);
    param.setValueAtTime(value, t);
  }
}

export class Voice {
  /** Nota con la compuerta abierta; null si la voz está libre o en release. */
  note: number | null = null;
  /** Momento del último release: se prefieren las voces que llevan más tiempo calladas. */
  releasedAt = -Infinity;
  /** Nota a la que están afinados los osciladores. */
  private pitch: number | null = null;

  private readonly oscillators: OscillatorNode[] = [];
  private readonly filter: BiquadFilterNode;
  private readonly vca: GainNode;
  private readonly trim: GainNode;
  private readonly modulator: OscillatorNode | null = null;
  private readonly modDepth: GainNode | null = null;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly preset: PresetDef,
    destination: AudioNode,
    private readonly vibrato: AudioNode | null,
  ) {
    const t = ctx.currentTime;
    this.filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: preset.filter.cutoff, Q: preset.filter.q });
    this.vca = new GainNode(ctx, { gain: 0 });
    this.trim = new GainNode(ctx, { gain: preset.level });
    this.filter.connect(this.vca).connect(this.trim).connect(destination);

    if (preset.fm) {
      this.modulator = new OscillatorNode(ctx, { type: 'sine', frequency: 440 * preset.fm.ratio });
      this.modDepth = new GainNode(ctx, { gain: 0 });
      this.modulator.connect(this.modDepth);
      this.modulator.start(t);
    }

    for (const spec of preset.oscillators) {
      const osc = new OscillatorNode(ctx, { type: spec.type, frequency: 440 * spec.ratio, detune: spec.detune });
      const gain = new GainNode(ctx, { gain: spec.gain });
      osc.connect(gain).connect(this.filter);
      if (vibrato) vibrato.connect(osc.detune);
      if (this.modDepth) this.modDepth.connect(osc.frequency);
      osc.start(t);
      this.oscillators.push(osc);
    }
  }

  /** Abre la compuerta con una nota nueva (ADSR completo). */
  attack(note: number, t: number, level: number): void {
    const silent = this.note === null && t - this.releasedAt > this.preset.amp.release * 1.5;
    // Si la voz aún suena en su cola, un glide cortísimo evita un salto audible de afinación.
    this.tune(note, t, silent || this.pitch === null ? 0 : 0.012);
    this.setLevel(level, t);
    this.envelope(note, t);
    this.note = note;
  }

  /** Lleva la voz a otra nota sin re-atacar (salvo en presets percutidos). */
  glide(note: number, t: number, level: number): void {
    this.tune(note, t, this.preset.glide);
    this.setLevel(level, t);
    if (this.preset.retrigger) {
      this.envelope(note, t);
    } else {
      const f = this.filter.frequency;
      const { filter } = this.preset;
      holdAt(f, t);
      f.setTargetAtTime(this.clampHz(this.cutoffFor(note) + filter.envAmount * filter.env.sustain), t, 0.08);
    }
    this.note = note;
  }

  release(t: number, fast = false): void {
    if (this.note === null) return;
    const { amp, filter } = this.preset;
    const g = this.vca.gain;
    holdAt(g, t);
    g.setTargetAtTime(0, t, fast ? 0.008 : amp.release / 4);
    const f = this.filter.frequency;
    holdAt(f, t);
    f.setTargetAtTime(this.clampHz(this.cutoffFor(this.pitch ?? 60)), t, fast ? 0.02 : filter.env.release / 4);
    this.note = null;
    this.releasedAt = t;
  }

  setLevel(level: number, t: number): void {
    this.trim.gain.setTargetAtTime(level, t, 0.02);
  }

  /** Apaga la voz con un fundido corto y libera sus nodos. */
  dispose(t: number): void {
    const g = this.vca.gain;
    holdAt(g, t);
    g.setTargetAtTime(0, t, 0.04);
    this.note = null;
    const stopAt = t + 0.4;
    const first = this.oscillators[0];
    if (first) {
      first.onended = () => {
        for (const osc of this.oscillators) {
          if (this.vibrato) this.vibrato.disconnect(osc.detune);
          osc.disconnect();
        }
        this.modulator?.disconnect();
        this.modDepth?.disconnect();
        this.trim.disconnect();
      };
    }
    for (const osc of this.oscillators) osc.stop(stopAt);
    this.modulator?.stop(stopAt);
  }

  private tune(note: number, t: number, glide: number): void {
    const f = midiToFrequency(note);
    const set = (param: AudioParam, value: number): void => {
      if (glide > 0) {
        holdAt(param, t);
        param.exponentialRampToValueAtTime(value, t + glide);
      } else {
        param.cancelScheduledValues(t);
        param.setValueAtTime(value, t);
      }
    };
    this.oscillators.forEach((osc, k) => set(osc.frequency, f * this.preset.oscillators[k]!.ratio));
    if (this.modulator && this.preset.fm) set(this.modulator.frequency, f * this.preset.fm.ratio);
    this.pitch = note;
  }

  /**
   * Envolventes de amplitud, filtro y (si hay) índice de FM, desde el valor actual.
   *
   * Todas las fases usan setTargetAtTime (curvas exponenciales tipo RC): en
   * Chromium, una rampa lineal programada tras cancelAndHoldAtTime sobre un
   * setTargetAtTime en curso arranca desde un valor equivocado y produce un
   * escalón audible al re-atacar una voz que aún suena.
   */
  private envelope(note: number, t: number): void {
    const { amp, filter, fm } = this.preset;
    // Con τ = fase / 3 la curva llega al 95 % al final de la fase.
    const g = this.vca.gain;
    holdAt(g, t);
    g.setTargetAtTime(1, t, amp.attack / 3);
    g.setTargetAtTime(amp.sustain, t + amp.attack, amp.decay / 3);

    const base = this.cutoffFor(note);
    const f = this.filter.frequency;
    holdAt(f, t);
    if (filter.envAmount > 0) {
      f.setTargetAtTime(this.clampHz(base + filter.envAmount), t, filter.env.attack / 3);
      f.setTargetAtTime(
        this.clampHz(base + filter.envAmount * filter.env.sustain),
        t + filter.env.attack,
        filter.env.decay / 3,
      );
    } else {
      f.setTargetAtTime(this.clampHz(base), t, 0.01);
    }

    if (fm && this.modDepth) {
      // Desviación en Hz = índice × frecuencia del modulador.
      const hz = midiToFrequency(note) * fm.ratio;
      const d = this.modDepth.gain;
      holdAt(d, t);
      d.setTargetAtTime(fm.index * hz, t, 0.0015);
      d.setTargetAtTime(fm.sustainIndex * hz, t + 0.005, fm.decay / 3);
    }
  }

  private cutoffFor(note: number): number {
    const { cutoff, keyTrack } = this.preset.filter;
    return cutoff * Math.pow(2, ((note - 60) / 12) * keyTrack);
  }

  private clampHz(hz: number): number {
    return Math.min(Math.max(hz, 40), this.ctx.sampleRate * 0.45);
  }
}
