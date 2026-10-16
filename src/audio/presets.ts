/**
 * Presets de sonido. Tiempos en segundos; sustain y ganancias en 0..1.
 *
 * Para crear uno nuevo: añade su id a PRESET_IDS y su definición a PRESETS.
 * Los campos opcionales (pulso, ruido, LFO de filtro, formantes, saturación,
 * trémolo, chorus, sala) solo cuestan CPU si el preset los usa.
 * docs/armonia.md explica cómo está hecho cada sonido.
 */

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
  /** Onda de pulso con este ancho (0..1) en lugar de `type`: 0.5 = cuadrada, menos = más nasal. */
  readonly pulseWidth?: number;
  /** Posición estéreo, de -1 (izquierda) a 1 (derecha). */
  readonly pan?: number;
}

export interface Formant {
  readonly freq: number;
  readonly q: number;
  /** Ganancia lineal del pico. */
  readonly gain: number;
}

export interface PresetDef {
  readonly id: PresetId;
  readonly name: string;
  /** Familia, para agrupar el selector. */
  readonly group: string;
  /** Cómo suena, en una línea. */
  readonly description: string;
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
  /** Capa de ruido por voz (soplido, aire), filtrada en banda y con la envolvente de la voz. */
  readonly noise?: { readonly gain: number; readonly color: 'white' | 'pink'; readonly bandHz: number; readonly q: number };
  /** LFO compartido que mueve el corte del filtro de todas las voces (barridos lentos). */
  readonly filterLfo?: { readonly rate: number; readonly depthHz: number };
  /** Banco de filtros pasa-banda en paralelo: imita las resonancias de la voz humana. */
  readonly formants?: readonly Formant[];
  /** Saturación suave, 0..1. */
  readonly drive?: number;
  /** Trémolo (volumen oscilante), profundidad 0..1. */
  readonly tremolo?: { readonly rate: number; readonly depth: number };
  /** Mezcla de chorus estéreo, 0..1. */
  readonly chorus?: number;
  /** Sala de reverb: «room» (2.8 s) o «hall» (6 s). Por defecto, room. */
  readonly space?: 'room' | 'hall';
  /** Si las notas que cambian se re-atacan (piano) o solo se deslizan (pads). */
  readonly retrigger: boolean;
  /** Duración del glide entre notas. */
  readonly glide: number;
  /** Ganancia de cada voz del acorde y del bajo. */
  readonly level: number;
  readonly bassLevel: number;
}

export const PRESET_IDS = [
  'warmPad',
  'brightSaw',
  'strings',
  'electricPiano',
  'organ',
  'supersaw',
  'junoPad',
  'choir',
  'pluck',
  'brass',
  'chiptune',
  'glassBells',
  'lofiKeys',
  'musicBox',
  'airFlute',
  'darkDrone',
  'hallPad',
] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export function isPresetId(value: unknown): value is PresetId {
  return typeof value === 'string' && (PRESET_IDS as readonly string[]).includes(value);
}

export const PRESETS: Record<PresetId, PresetDef> = {
  warmPad: {
    id: 'warmPad',
    name: 'Warm Pad',
    group: 'Clásicos',
    description: 'Pad cálido de dos sierras con sub-octava; se abre despacio.',
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
    group: 'Clásicos',
    description: 'Tres sierras brillantes con ataque de filtro marcado.',
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
    group: 'Clásicos',
    description: 'Sección de cuerdas sintética con vibrato.',
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
    group: 'Clásicos',
    description: 'Piano eléctrico FM con campana al atacar.',
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
    group: 'Clásicos',
    description: 'Órgano de tres registros (8, 4 y 2⅔ pies) con vibrato.',
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

  // ---------------------------------------------------------------------------
  // Pads modernos
  // ---------------------------------------------------------------------------
  supersaw: {
    id: 'supersaw',
    name: 'Supersaw',
    group: 'Pads modernos',
    description: 'Siete sierras desafinadas abiertas en estéreo: el pad gigante del trance.',
    oscillators: [
      { type: 'sawtooth', ratio: 1, detune: -22, gain: 0.18, pan: -0.9 },
      { type: 'sawtooth', ratio: 1, detune: -14, gain: 0.22, pan: -0.6 },
      { type: 'sawtooth', ratio: 1, detune: -7, gain: 0.26, pan: -0.3 },
      { type: 'sawtooth', ratio: 1, detune: 0, gain: 0.3 },
      { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.26, pan: 0.3 },
      { type: 'sawtooth', ratio: 1, detune: 14, gain: 0.22, pan: 0.6 },
      { type: 'sawtooth', ratio: 1, detune: 22, gain: 0.18, pan: 0.9 },
    ],
    amp: { attack: 0.06, decay: 0.4, sustain: 0.85, release: 0.9 },
    filter: {
      cutoff: 2600,
      q: 0.8,
      envAmount: 2000,
      keyTrack: 0.4,
      env: { attack: 0.05, decay: 0.8, sustain: 0.4, release: 0.8 },
    },
    chorus: 0.25,
    retrigger: false,
    glide: 0.04,
    level: 0.35,
    bassLevel: 0.36,
  },
  junoPad: {
    id: 'junoPad',
    name: 'Juno Pad',
    group: 'Pads modernos',
    description: 'Pulso y sierra con sub-octava, filtro que respira y el chorus clásico de los 80.',
    oscillators: [
      { type: 'square', pulseWidth: 0.38, ratio: 1, detune: -5, gain: 0.5 },
      { type: 'sawtooth', ratio: 1, detune: 6, gain: 0.35 },
      { type: 'square', pulseWidth: 0.5, ratio: 0.5, detune: 0, gain: 0.25 },
    ],
    amp: { attack: 0.5, decay: 1, sustain: 0.9, release: 1.5 },
    filter: {
      cutoff: 900,
      q: 2.2,
      envAmount: 600,
      keyTrack: 0.5,
      env: { attack: 0.8, decay: 1.5, sustain: 0.5, release: 1.4 },
    },
    filterLfo: { rate: 0.18, depthHz: 350 },
    chorus: 0.85,
    retrigger: false,
    glide: 0.05,
    level: 0.2,
    bassLevel: 0.2,
  },
  choir: {
    id: 'choir',
    name: 'Choir "Aah"',
    group: 'Pads modernos',
    description: 'Coro sintético: sierras filtradas por las resonancias de la vocal «a».',
    oscillators: [
      { type: 'sawtooth', ratio: 1, detune: -6, gain: 0.45, pan: -0.3 },
      { type: 'sawtooth', ratio: 1, detune: 6, gain: 0.45, pan: 0.3 },
      { type: 'square', pulseWidth: 0.3, ratio: 1, detune: 0, gain: 0.25 },
    ],
    amp: { attack: 0.6, decay: 0.6, sustain: 0.9, release: 1.3 },
    filter: {
      cutoff: 3500,
      q: 0.5,
      envAmount: 0,
      keyTrack: 0,
      env: { attack: 0.1, decay: 0.1, sustain: 1, release: 1 },
    },
    formants: [
      { freq: 800, q: 6, gain: 1 },
      { freq: 1150, q: 8, gain: 0.55 },
      { freq: 2900, q: 10, gain: 0.25 },
    ],
    vibrato: { rate: 5, depthCents: 9 },
    noise: { gain: 0.05, color: 'pink', bandHz: 2500, q: 0.8 },
    chorus: 0.6,
    retrigger: false,
    glide: 0.06,
    level: 1.1,
    bassLevel: 0.9,
  },

  // ---------------------------------------------------------------------------
  // Ataque y carácter
  // ---------------------------------------------------------------------------
  pluck: {
    id: 'pluck',
    name: 'Pluck',
    group: 'Ataque y carácter',
    description: 'Cuerda pulsada sintética: un golpe de filtro brevísimo que se apaga solo.',
    oscillators: [
      { type: 'sawtooth', ratio: 1, detune: -4, gain: 0.5 },
      { type: 'square', ratio: 1, detune: 4, gain: 0.25 },
    ],
    amp: { attack: 0.002, decay: 0.9, sustain: 0, release: 0.35 },
    filter: {
      cutoff: 400,
      q: 3,
      envAmount: 5000,
      keyTrack: 0.7,
      env: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.2 },
    },
    chorus: 0.2,
    retrigger: true,
    glide: 0.02,
    level: 0.31,
    bassLevel: 0.29,
  },
  brass: {
    id: 'brass',
    name: 'Analog Brass',
    group: 'Ataque y carácter',
    description: 'Metales analógicos: el filtro se abre al atacar, con un poco de saturación.',
    oscillators: [
      { type: 'sawtooth', ratio: 1, detune: -5, gain: 0.5 },
      { type: 'sawtooth', ratio: 1, detune: 5, gain: 0.5 },
    ],
    amp: { attack: 0.06, decay: 0.3, sustain: 0.85, release: 0.25 },
    filter: {
      cutoff: 450,
      q: 1.2,
      envAmount: 2600,
      keyTrack: 0.6,
      env: { attack: 0.09, decay: 0.5, sustain: 0.45, release: 0.3 },
    },
    vibrato: { rate: 5.5, depthCents: 4 },
    drive: 0.35,
    retrigger: false,
    glide: 0.04,
    level: 0.15,
    bassLevel: 0.15,
  },
  chiptune: {
    id: 'chiptune',
    name: 'Chiptune',
    group: 'Ataque y carácter',
    description: 'Pulsos finos sin filtro, como una consola de 8 bits.',
    oscillators: [
      { type: 'square', pulseWidth: 0.25, ratio: 1, detune: 0, gain: 0.45 },
      { type: 'square', pulseWidth: 0.125, ratio: 2, detune: 0, gain: 0.15 },
    ],
    amp: { attack: 0.002, decay: 0.05, sustain: 0.9, release: 0.04 },
    filter: {
      cutoff: 12000,
      q: 0.1,
      envAmount: 0,
      keyTrack: 0,
      env: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.05 },
    },
    vibrato: { rate: 6, depthCents: 8 },
    retrigger: true,
    glide: 0.015,
    level: 0.27,
    bassLevel: 0.27,
  },

  // ---------------------------------------------------------------------------
  // Teclas y campanas FM
  // ---------------------------------------------------------------------------
  glassBells: {
    id: 'glassBells',
    name: 'Glass Bells',
    group: 'Teclas y campanas FM',
    description: 'Campanas de vidrio: FM con relación inarmónica 3.5:1 y cola larga.',
    oscillators: [
      { type: 'sine', ratio: 1, detune: -3, gain: 0.5 },
      { type: 'sine', ratio: 1, detune: 3, gain: 0.5 },
    ],
    amp: { attack: 0.002, decay: 3.5, sustain: 0, release: 1.6 },
    filter: {
      cutoff: 9000,
      q: 0.3,
      envAmount: 0,
      keyTrack: 0,
      env: { attack: 0.01, decay: 0.5, sustain: 1, release: 1.6 },
    },
    fm: { ratio: 3.5, index: 3.2, sustainIndex: 0.25, decay: 1.2 },
    space: 'hall',
    retrigger: true,
    glide: 0.02,
    level: 0.26,
    bassLevel: 0.2,
  },
  lofiKeys: {
    id: 'lofiKeys',
    name: 'Lo-fi Keys',
    group: 'Teclas y campanas FM',
    description: 'Piano eléctrico tipo Wurlitzer: FM 1:1, trémolo y saturación cálida.',
    oscillators: [
      { type: 'sine', ratio: 1, detune: -5, gain: 0.55 },
      { type: 'sine', ratio: 1, detune: 5, gain: 0.55 },
    ],
    amp: { attack: 0.004, decay: 2.2, sustain: 0.35, release: 0.45 },
    filter: {
      cutoff: 2800,
      q: 0.5,
      envAmount: 0,
      keyTrack: 0,
      env: { attack: 0.01, decay: 0.5, sustain: 1, release: 0.45 },
    },
    fm: { ratio: 1, index: 1.6, sustainIndex: 0.4, decay: 0.7 },
    drive: 0.45,
    tremolo: { rate: 5.2, depth: 0.35 },
    chorus: 0.3,
    retrigger: true,
    glide: 0.03,
    level: 0.22,
    bassLevel: 0.21,
  },
  musicBox: {
    id: 'musicBox',
    name: 'Music Box',
    group: 'Teclas y campanas FM',
    description: 'Caja de música: una octava arriba, metálica y de decaimiento corto.',
    oscillators: [
      { type: 'sine', ratio: 2, detune: 0, gain: 0.6 },
      { type: 'sine', ratio: 4, detune: 2, gain: 0.12 },
    ],
    amp: { attack: 0.001, decay: 1.4, sustain: 0, release: 0.6 },
    filter: {
      cutoff: 9000,
      q: 0.3,
      envAmount: 0,
      keyTrack: 0,
      env: { attack: 0.01, decay: 0.5, sustain: 1, release: 0.6 },
    },
    fm: { ratio: 10, index: 0.25, sustainIndex: 0.03, decay: 0.3 },
    space: 'hall',
    retrigger: true,
    glide: 0.01,
    level: 0.33,
    bassLevel: 0.18,
  },

  // ---------------------------------------------------------------------------
  // Texturas ambient
  // ---------------------------------------------------------------------------
  airFlute: {
    id: 'airFlute',
    name: 'Air Flute',
    group: 'Texturas ambient',
    description: 'Flauta de aire: senoide con soplido de ruido rosa y vibrato suave.',
    oscillators: [
      { type: 'sine', ratio: 1, detune: 0, gain: 0.6 },
      { type: 'triangle', ratio: 2, detune: 3, gain: 0.08 },
    ],
    amp: { attack: 0.18, decay: 0.4, sustain: 0.85, release: 0.5 },
    filter: {
      cutoff: 3000,
      q: 0.5,
      envAmount: 0,
      keyTrack: 0.5,
      env: { attack: 0.1, decay: 0.3, sustain: 1, release: 0.5 },
    },
    noise: { gain: 0.12, color: 'pink', bandHz: 2200, q: 1.2 },
    vibrato: { rate: 4.6, depthCents: 7 },
    chorus: 0.2,
    retrigger: false,
    glide: 0.05,
    level: 0.24,
    bassLevel: 0.2,
  },
  darkDrone: {
    id: 'darkDrone',
    name: 'Dark Drone',
    group: 'Texturas ambient',
    description: 'Drone oscuro: sierras graves tras un filtro muy cerrado que se mueve lento.',
    oscillators: [
      { type: 'sawtooth', ratio: 1, detune: -9, gain: 0.5, pan: -0.4 },
      { type: 'sawtooth', ratio: 1, detune: 9, gain: 0.5, pan: 0.4 },
      { type: 'sine', ratio: 0.5, detune: 0, gain: 0.4 },
    ],
    amp: { attack: 1.6, decay: 1, sustain: 1, release: 3.2 },
    filter: {
      cutoff: 260,
      q: 3.5,
      envAmount: 300,
      keyTrack: 0.3,
      env: { attack: 2, decay: 2, sustain: 0.5, release: 3 },
    },
    filterLfo: { rate: 0.07, depthHz: 180 },
    chorus: 0.4,
    space: 'hall',
    retrigger: false,
    glide: 0.08,
    level: 0.24,
    bassLevel: 0.22,
  },
  hallPad: {
    id: 'hallPad',
    name: 'Hall Pad',
    group: 'Texturas ambient',
    description: 'Pad etéreo de entrada y salida lentísimas en una sala enorme.',
    oscillators: [
      { type: 'triangle', ratio: 1, detune: -6, gain: 0.5, pan: -0.5 },
      { type: 'triangle', ratio: 1, detune: 6, gain: 0.5, pan: 0.5 },
      { type: 'sawtooth', ratio: 1, detune: 0, gain: 0.12 },
    ],
    amp: { attack: 1.4, decay: 1, sustain: 0.95, release: 4.5 },
    filter: {
      cutoff: 1600,
      q: 0.6,
      envAmount: 500,
      keyTrack: 0.4,
      env: { attack: 2, decay: 2, sustain: 0.6, release: 4 },
    },
    chorus: 0.7,
    space: 'hall',
    retrigger: false,
    glide: 0.06,
    level: 0.24,
    bassLevel: 0.2,
  },
};
