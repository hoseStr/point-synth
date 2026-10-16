/**
 * Teoría musical pura: intervalos, nombres de acordes, ortografía y voice leading.
 * Sin DOM ni audio, para poder testearla con Vitest.
 *
 * Convenciones:
 * - Clase de altura (pitch class): 0..11, con C = 0.
 * - Notas MIDI: C4 = 60 (la octava `o` empieza en 12 * (o + 1)).
 * - Los nombres internos usan ASCII ("Eb", "F#", "Bbb"); `formatNote` los pasa a ♭/♯.
 */

export interface QualityDef {
  /** Semitonos desde la raíz. */
  readonly intervals: readonly number[];
  /** Grado de cada intervalo (1 = raíz, 3 = tercera…); decide la letra al escribir la nota. */
  readonly degrees: readonly number[];
  /** Sufijo en el nombre del acorde ("" para mayor). */
  readonly suffix: string;
}

export const QUALITY_DEFS = {
  maj: { intervals: [0, 4, 7], degrees: [1, 3, 5], suffix: '' },
  m: { intervals: [0, 3, 7], degrees: [1, 3, 5], suffix: 'm' },
  '7': { intervals: [0, 4, 7, 10], degrees: [1, 3, 5, 7], suffix: '7' },
  maj7: { intervals: [0, 4, 7, 11], degrees: [1, 3, 5, 7], suffix: 'maj7' },
  m7: { intervals: [0, 3, 7, 10], degrees: [1, 3, 5, 7], suffix: 'm7' },
  dim: { intervals: [0, 3, 6], degrees: [1, 3, 5], suffix: 'dim' },
  aug: { intervals: [0, 4, 8], degrees: [1, 3, 5], suffix: 'aug' },
  sus4: { intervals: [0, 5, 7], degrees: [1, 4, 5], suffix: 'sus4' },
  // Extras: no están en la rueda por defecto, pero se pueden añadir en config.ts.
  sus2: { intervals: [0, 2, 7], degrees: [1, 2, 5], suffix: 'sus2' },
  '6': { intervals: [0, 4, 7, 9], degrees: [1, 3, 5, 6], suffix: '6' },
  m6: { intervals: [0, 3, 7, 9], degrees: [1, 3, 5, 6], suffix: 'm6' },
  dim7: { intervals: [0, 3, 6, 9], degrees: [1, 3, 5, 7], suffix: 'dim7' },
  m7b5: { intervals: [0, 3, 6, 10], degrees: [1, 3, 5, 7], suffix: 'm7b5' },
  add9: { intervals: [0, 4, 7, 14], degrees: [1, 3, 5, 9], suffix: 'add9' },
} as const satisfies Record<string, QualityDef>;

export type QualityId = keyof typeof QUALITY_DEFS;

export function isQualityId(value: string): value is QualityId {
  return Object.prototype.hasOwnProperty.call(QUALITY_DEFS, value);
}

export function chordIntervals(quality: QualityId): readonly number[] {
  return QUALITY_DEFS[quality].intervals;
}

/** Normaliza cualquier entero a 0..11. */
export function pc(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** Clases de altura del acorde, en el orden de sus intervalos (raíz primero), sin repetir. */
export function chordPitchClasses(root: number, quality: QualityId): number[] {
  const out: number[] = [];
  for (const i of chordIntervals(quality)) {
    const p = pc(root + i);
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ortografía
// ---------------------------------------------------------------------------

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11] as const;

interface SpelledNote {
  /** Índice en LETTERS. */
  readonly letter: number;
  /** Alteración en semitonos: -2 (bb) … +2 (##). */
  readonly accidental: number;
}

/** Diferencia de semitonos llevada a -6..5. */
function wrapSigned(n: number): number {
  return pc(n + 6) - 6;
}

function spelledPc(n: SpelledNote): number {
  return pc(LETTER_PCS[n.letter]! + n.accidental);
}

function spelledName(n: SpelledNote): string {
  const acc = n.accidental;
  const suffix = acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc);
  return LETTERS[n.letter]! + suffix;
}

/**
 * Grafías posibles de una raíz. Teclas blancas: solo la natural.
 * Teclas negras: primero el sostenido (como en la rueda), después el bemol.
 */
function rootSpellings(rootPc: number): SpelledNote[] {
  const natural = LETTER_PCS.indexOf(rootPc as (typeof LETTER_PCS)[number]);
  if (natural >= 0) return [{ letter: natural, accidental: 0 }];
  const below = LETTER_PCS.indexOf(pc(rootPc - 1) as (typeof LETTER_PCS)[number]);
  const above = LETTER_PCS.indexOf(pc(rootPc + 1) as (typeof LETTER_PCS)[number]);
  return [
    { letter: below, accidental: 1 },
    { letter: above, accidental: -1 },
  ];
}

/** La nota a `interval` semitonos de la raíz, escrita con la letra de su grado. */
function spellInterval(root: SpelledNote, interval: number, degree: number): SpelledNote {
  const letter = (root.letter + degree - 1) % 7;
  const target = pc(spelledPc(root) + interval);
  return { letter, accidental: wrapSigned(target - LETTER_PCS[letter]!) };
}

/** Cuánto "cuesta" leer un acorde: alteraciones, dobles alteraciones y E#/B#/Cb/Fb. */
function readabilityCost(notes: readonly SpelledNote[]): number {
  let cost = 0;
  for (const n of notes) {
    const a = Math.abs(n.accidental);
    cost += a;
    if (a >= 2) cost += 3;
    const name = spelledName(n);
    if (name === 'E#' || name === 'B#' || name === 'Cb' || name === 'Fb') cost += 1;
  }
  return cost;
}

export interface SpelledChord {
  /** Nombre de la raíz elegida, p. ej. "Bb" para A# mayor. */
  readonly root: string;
  /** Notas del acorde en orden de intervalos, p. ej. ["C", "Eb", "G"]. */
  readonly notes: readonly string[];
}

/**
 * Escribe el acorde con la ortografía correcta (cada grado con su letra) y, en
 * teclas negras, con la grafía de raíz más legible. Si empatan, gana el
 * sostenido, que es como aparece en la rueda.
 */
export function spellChord(root: number, quality: QualityId): SpelledChord {
  const def = QUALITY_DEFS[quality];
  let best: { root: SpelledNote; notes: SpelledNote[]; cost: number } | null = null;
  for (const r of rootSpellings(pc(root))) {
    const notes = def.intervals.map((iv, k) => spellInterval(r, iv, def.degrees[k]!));
    const cost = readabilityCost(notes);
    if (best === null || cost < best.cost) best = { root: r, notes, cost };
  }
  // rootSpellings siempre devuelve al menos una grafía.
  const chosen = best!;
  return { root: spelledName(chosen.root), notes: chosen.notes.map(spelledName) };
}

/** Nombre del acorde: "C", "Cm", "G7", "Bdim", "Bb"… */
export function chordName(root: number, quality: QualityId): string {
  return spellChord(root, quality).root + QUALITY_DEFS[quality].suffix;
}

/** Nombres de las notas del acorde con la ortografía correcta: Cm → ["C", "Eb", "G"]. */
export function chordNotes(root: number, quality: QualityId): string[] {
  return [...spellChord(root, quality).notes];
}

/** Convierte "Eb", "F#", "Bbb", "F##" a la forma tipográfica con ♭ ♯ 𝄫 𝄪. */
export function formatNote(name: string): string {
  return name.replace(/##/g, '𝄪').replace(/#/g, '♯').replace(/bb/g, '𝄫').replace(/b/g, '♭');
}

/** Formatea un nombre de acorde completo: solo toca las alteraciones de la raíz. */
export function formatChordName(name: string): string {
  const match = /^([A-G](?:##|#|bb|b)?)(.*)$/.exec(name);
  if (!match) return name;
  return formatNote(match[1]!) + match[2]!;
}

// ---------------------------------------------------------------------------
// Escalas (solo visual)
// ---------------------------------------------------------------------------

export type ScaleMode = 'major' | 'minor';

const SCALE_STEPS: Record<ScaleMode, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export function scalePitchClasses(tonic: number, mode: ScaleMode): number[] {
  return SCALE_STEPS[mode].map((s) => pc(tonic + s));
}

// ---------------------------------------------------------------------------
// Voice leading
// ---------------------------------------------------------------------------

export interface Voicing {
  /** Notas MIDI del acorde, en posición cerrada y en orden ascendente. */
  readonly notes: readonly number[];
  /** La raíz una octava por debajo de donde aparece en el voicing. */
  readonly bass: number;
}

/** Primer C de la octava base (C4 = 60). */
export function octaveStart(octave: number): number {
  return 12 * (octave + 1);
}

/** Rango permitido para la nota más grave del voicing, relativo al C de la octava base. */
const LOWEST_NOTE_RANGE = { below: 8, above: 9 } as const;
/** Centro de registro hacia el que tiende el voicing (semitonos sobre el C base). */
const REGISTER_CENTER = 4;
/** Peso de la atracción al registro central; pequeño para que mande el voice leading. */
const REGISTER_WEIGHT = 0.25;

/**
 * Costo de ir del conjunto de notas `a` al `b` (ambos ordenados de menor a mayor):
 * suma de distancias en semitonos con el mejor emparejamiento ordenado. Si los
 * tamaños difieren, las notas sin pareja cuestan su distancia a la nota más cercana.
 */
export function movementCost(a: readonly number[], b: readonly number[]): number {
  const [small, big] = a.length <= b.length ? [a, b] : [b, a];
  if (small.length === 0) return 0;
  let best = Infinity;
  const picked: number[] = [];
  const recurse = (start: number): void => {
    if (picked.length === small.length) {
      let cost = 0;
      for (let k = 0; k < small.length; k++) cost += Math.abs(small[k]! - big[picked[k]!]!);
      for (let j = 0; j < big.length; j++) {
        if (picked.includes(j)) continue;
        let nearest = Infinity;
        for (const s of small) nearest = Math.min(nearest, Math.abs(big[j]! - s));
        cost += nearest;
      }
      best = Math.min(best, cost);
      return;
    }
    const remaining = small.length - picked.length;
    for (let j = start; j <= big.length - remaining; j++) {
      picked.push(j);
      recurse(j + 1);
      picked.pop();
    }
  };
  recurse(0);
  return best;
}

/** Apila las clases de altura en posición cerrada empezando por `lowest`. */
function stackClosed(pitchClasses: readonly number[], lowest: number): number[] {
  const out = [lowest];
  for (let k = 1; k < pitchClasses.length; k++) {
    const prev = out[k - 1]!;
    out.push(prev + pc(pitchClasses[k]! - prev) || prev + 12);
  }
  return out;
}

function mean(xs: readonly number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/**
 * Elige la inversión y la octava del acorde que menos se mueven respecto al
 * voicing anterior, dentro de un rango alrededor de la octava base. Sin acorde
 * anterior, usa posición fundamental en el registro central.
 */
export function voiceChord(
  root: number,
  quality: QualityId,
  previous: readonly number[] | null,
  baseOctave: number,
): Voicing {
  const pcs = chordPitchClasses(root, quality);
  const baseC = octaveStart(baseOctave);
  const lowMin = baseC - LOWEST_NOTE_RANGE.below;
  const lowMax = baseC + LOWEST_NOTE_RANGE.above;
  const center = baseC + REGISTER_CENTER;
  const hasPrevious = previous !== null && previous.length > 0;
  const prevSorted = hasPrevious ? [...previous].sort((x, y) => x - y) : [];

  let best: { notes: number[]; cost: number } | null = null;
  for (let inversion = 0; inversion < pcs.length; inversion++) {
    if (!hasPrevious && inversion > 0) break;
    const rotated = [...pcs.slice(inversion), ...pcs.slice(0, inversion)];
    for (let lowest = lowMin; lowest <= lowMax; lowest++) {
      if (pc(lowest) !== rotated[0]) continue;
      const notes = stackClosed(rotated, lowest);
      const movement = hasPrevious ? movementCost(prevSorted, notes) : 0;
      const cost = movement + REGISTER_WEIGHT * Math.abs(mean(notes) - center);
      if (best === null || cost < best.cost - 1e-9) best = { notes, cost };
    }
  }
  // El rango cubre más de una octava, así que siempre hay al menos un candidato.
  const notes = best!.notes;
  const rootNote = notes.find((n) => pc(n) === pc(root))!;
  let bass = rootNote - 12;
  // Con acordes de más de una octava (add9) el bajo debe seguir quedando abajo.
  while (bass >= notes[0]!) bass -= 12;
  return { notes, bass };
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
