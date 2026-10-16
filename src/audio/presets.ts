/** Presets de sonido. Tiempos en segundos; sustain y ganancias en 0..1. */

export interface Envelope {
  readonly attack: number;
  readonly decay: number;
  readonly sustain: number;
  readonly release: number;
}

export interface OscillatorSpec {
  readonly type: OscillatorType;
  /** Múltiplo de la frecuencia de la nota (1 = fundamental, 2 = octava…). */
  readonly ratio: number;
  /** Desafinación fija en cents. */
  readonly detune: number;
  readonly gain: number;
}

export interface PresetDef {
  readonly id: PresetId;
  readonly name: string;
  readonly oscillators: readonly OscillatorSpec[];
  readonly amp: Envelope;
  readonly filter: {
    readonly cutoff: number;
    readonly q: number;
    /** Hz que suma la envolvente del filtro en su pico. */
    readonly envAmount: number;
    /** 0 = corte fijo, 1 = el corte sigue a la nota octava por octava. */
    readonly keyTrack: number;
    readonly env: Envelope;
  };
  /** FM simple: un modulador senoidal compartido por los osciladores de la voz. */
  readonly fm?: {
    readonly ratio: number;
    /** Índice de modulación al atacar y en el sustain. */
    readonly index: number;
    readonly sustainIndex: number;
    readonly decay: number;
  };
  readonly vibrato?: { readonly rate: number; readonly depthCents: number };
  /** Si las notas que cambian se re-atacan (piano) o solo se deslizan (pads). */
  readonly retrigger: boolean;
  /** Duración del glide entre notas. */
  readonly glide: number;
  /** Ganancia de cada voz del acorde y del bajo. */
  readonly level: number;
  readonly bassLevel: number;
}

export const PRESET_IDS = ['warmPad', 'brightSaw', 'strings', 'electricPiano', 'organ'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export function isPresetId(value: unknown): value is PresetId {
  return typeof value === 'string' && (PRESET_IDS as readonly string[]).includes(value);
}

export const PRESETS: Record<PresetId, PresetDef> = {
  warmPad: {
    id: 'warmPad',
    name: 'Warm Pad',
    oscillators: [
      { type: 'sawtooth', ratio: 1, detune: -7, gain: 0.5 },
      { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.5 },
      { type: 'triangle', ratio: 0.5, detune: 0, gain: 0.35 },
    ],
    amp: { attack: 0.35, decay: 0.8, sustain: 0.85, release: 1.2 },
    filter: {
      cutoff: 650,
      q: 0.9,
      envAmount: 900,
      keyTrack: 0.5,
      env: { attack: 0.6, decay: 1.5, sustain: 0.35, release: 1.2 },
    },
    retrigger: false,
    glide: 0.04,
    level: 0.2,
    bassLevel: 0.22,
  },
  brightSaw: {
    id: 'brightSaw',
    name: 'Bright Saw',
    oscillators: [
      { type: 'sawtooth', ratio: 1, detune: -7, gain: 0.4 },
      { type: 'sawtooth', ratio: 1, detune: 0, gain: 0.4 },
      { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.4 },
    ],
    amp: { attack: 0.012, decay: 0.3, sustain: 0.75, release: 0.35 },
    filter: {
      cutoff: 1800,
      q: 2.5,
      envAmount: 3800,
      keyTrack: 0.6,
      env: { attack: 0.005, decay: 0.45, sustain: 0.3, release: 0.35 },
    },
    retrigger: false,
    glide: 0.04,
    level: 0.14,
    bassLevel: 0.15,
  },
  strings: {
    id: 'strings',
    name: 'Strings',
    oscillators: [
      { type: 'sawtooth', ratio: 1, detune: -7, gain: 0.4 },
      { type: 'sawtooth', ratio: 1, detune: 2, gain: 0.35 },
      { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.4 },
    ],
    amp: { attack: 0.45, decay: 0.5, sustain: 0.9, release: 0.9 },
    filter: {
      cutoff: 2200,
      q: 0.6,
      envAmount: 700,
      keyTrack: 0.4,
      env: { attack: 0.5, decay: 1, sustain: 0.6, release: 0.9 },
    },
    vibrato: { rate: 5.2, depthCents: 7 },
    retrigger: false,
    glide: 0.05,
    level: 0.16,
    bassLevel: 0.16,
  },
  electricPiano: {
    id: 'electricPiano',
    name: 'Electric Piano',
    oscillators: [
      { type: 'sine', ratio: 1, detune: -4, gain: 0.55 },
      { type: 'sine', ratio: 1, detune: 4, gain: 0.55 },
    ],
    amp: { attack: 0.004, decay: 1.8, sustain: 0.3, release: 0.5 },
    filter: {
      cutoff: 5000,
      q: 0.4,
      envAmount: 0,
      keyTrack: 0,
      env: { attack: 0.01, decay: 0.5, sustain: 1, release: 0.5 },
    },
    fm: { ratio: 1, index: 2.6, sustainIndex: 0.35, decay: 0.9 },
    retrigger: true,
    glide: 0.03,
    level: 0.32,
    bassLevel: 0.3,
  },
  organ: {
    id: 'organ',
    name: 'Organ',
    oscillators: [
      { type: 'sine', ratio: 1, detune: 0, gain: 0.5 },
      { type: 'sine', ratio: 2, detune: 3, gain: 0.32 },
      { type: 'sine', ratio: 3, detune: -3, gain: 0.22 },
    ],
    amp: { attack: 0.01, decay: 0.05, sustain: 1, release: 0.09 },
    filter: {
      cutoff: 6000,
      q: 0.3,
      envAmount: 0,
      keyTrack: 0,
      env: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.1 },
    },
    vibrato: { rate: 6.6, depthCents: 5 },
    retrigger: false,
    glide: 0.03,
    level: 0.2,
    bassLevel: 0.2,
  },
};
