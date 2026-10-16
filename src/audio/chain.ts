/**
 * Cadena de efectos propia de un preset, entre sus voces y el bus común:
 *
 *   voces → [formantes] → [saturación] → [trémolo] → [chorus] → salida
 *
 * Solo se crean los nodos que el preset usa. Al cambiar de preset, la cadena
 * vieja hace un fundido y se libera junto con sus voces.
 */
import type { PresetDef } from './presets';
import { holdAt } from './voice';
import { driveCurve } from './waves';

/** Retardo base del chorus y cuánto lo mueve el LFO (segundos). */
const CHORUS_DELAY = 0.012;
const CHORUS_DEPTH = 0.003;
const CHORUS_RATE = 0.55;

export class PresetChain {
  /** Entrada de las voces. */
  readonly input: GainNode;
  /** LFO compartido para el corte del filtro de las voces, si el preset lo pide. */
  readonly filterLfo: GainNode | null = null;
  private readonly output: GainNode;
  private readonly nodes: AudioNode[] = [];
  private readonly sources: AudioScheduledSourceNode[] = [];

  constructor(
    private readonly ctx: BaseAudioContext,
    preset: PresetDef,
    destination: AudioNode,
  ) {
    this.input = this.add(new GainNode(ctx, { gain: 1 }));
    this.output = this.add(new GainNode(ctx, { gain: 1 }));
    let tail: AudioNode = this.input;

    if (preset.formants?.length) {
      // Pasa-banda en paralelo: cada uno deja pasar una resonancia de la vocal.
      const sum = this.add(new GainNode(ctx, { gain: 1 }));
      for (const f of preset.formants) {
        const band = this.add(new BiquadFilterNode(ctx, { type: 'bandpass', frequency: f.freq, Q: f.q }));
        const gain = this.add(new GainNode(ctx, { gain: f.gain }));
        tail.connect(band).connect(gain).connect(sum);
      }
      tail = sum;
    }

    if (preset.drive) {
      const shaper = this.add(new WaveShaperNode(ctx, { curve: driveCurve(preset.drive), oversample: '2x' }));
      // La curva amplifica las señales bajas; esta compensación deja el volumen parecido al de los demás presets.
      const makeup = this.add(new GainNode(ctx, { gain: 1 / (1 + 2.5 * preset.drive) }));
      tail.connect(shaper).connect(makeup);
      tail = makeup;
    }

    if (preset.tremolo) {
      const { rate, depth } = preset.tremolo;
      const amp = this.add(new GainNode(ctx, { gain: 1 - depth / 2 }));
      const lfoDepth = this.add(new GainNode(ctx, { gain: depth / 2 }));
      this.lfo(rate).connect(lfoDepth).connect(amp.gain);
      tail.connect(amp);
      tail = amp;
    }

    if (preset.chorus) {
      // Dos líneas de retardo moduladas en contrafase, abiertas a izquierda y derecha.
      const mix = preset.chorus;
      const dry = this.add(new GainNode(ctx, { gain: 1 - mix * 0.3 }));
      const wet = this.add(new GainNode(ctx, { gain: mix * 0.8 }));
      const lfo = this.lfo(CHORUS_RATE);
      for (const side of [-1, 1] as const) {
        const delay = this.add(new DelayNode(ctx, { delayTime: CHORUS_DELAY, maxDelayTime: 0.05 }));
        const depth = this.add(new GainNode(ctx, { gain: side * CHORUS_DEPTH }));
        const pan = this.add(new StereoPannerNode(ctx, { pan: side * 0.8 }));
        lfo.connect(depth).connect(delay.delayTime);
        tail.connect(delay).connect(pan).connect(wet);
      }
      tail.connect(dry).connect(this.output);
      wet.connect(this.output);
    } else {
      tail.connect(this.output);
    }

    if (preset.filterLfo) {
      const lfoDepth = this.add(new GainNode(ctx, { gain: preset.filterLfo.depthHz }));
      this.lfo(preset.filterLfo.rate).connect(lfoDepth);
      this.filterLfo = lfoDepth;
    }

    this.output.connect(destination);
  }

  /** Fundido de salida y liberación de todos los nodos. */
  dispose(t: number): void {
    const g = this.output.gain;
    holdAt(g, t);
    g.setTargetAtTime(0, t, 0.05);
    for (const s of this.sources) s.stop(t + 0.6);
    const first = this.sources[0];
    const disconnectAll = (): void => {
      for (const n of this.nodes) n.disconnect();
    };
    // Sin LFOs no hay evento `ended`: se desconecta con un temporizador.
    if (first) first.onended = disconnectAll;
    else setTimeout(disconnectAll, 700);
  }

  private add<T extends AudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  private lfo(rate: number): OscillatorNode {
    const osc = this.add(new OscillatorNode(this.ctx, { type: 'sine', frequency: rate }));
    osc.start();
    this.sources.push(osc);
    return osc;
  }
}
