/**
 * Teoría musical pura: intervalos, nombres de acordes, ortografía y voice leading.
 * Sin DOM ni audio, para poder testearla con Vitest.
 *
 * Convenciones:
 * - Clase de altura (pitch class): 0..11, con C = 0.
 * - Notas MIDI: C4 = 60 (la octava `o` empieza en 12 * (o + 1)).
 * - Los nombres internos usan ASCII ("Eb", "F#", "Bbb"); `formatNote` los pasa a ♭/♯.
 */

import { CHORDS, voicingIntervals, type QualityId } from './chords';
import { SCALES, type ScaleId } from './scales';

export { CHORDS, isQualityId, type QualityId } from './chords';

export function chordIntervals(quality: QualityId): readonly number[] {
  return CHORDS[quality].intervals;
}

/** Normaliza cualquier entero a 0..11. */
export function pc(n: number): number {
  return ((n % 12) + 12) % 12;
}

function uniquePitchClasses(root: number, intervals: readonly number[]): number[] {
  const out: number[] = [];
  for (const i of intervals) {
    const p = pc(root + i);
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

/** Clases de altura del acorde, en el orden de sus intervalos (raíz primero), sin repetir. */
export function chordPitchClasses(root: number, quality: QualityId): number[] {
  return uniquePitchClasses(root, chordIntervals(quality));
}

/** Las que realmente suenan: con 5 o más notas se omite la quinta (ver voicingIntervals). */
export function voicingPitchClasses(root: number, quality: QualityId): number[] {
  return uniquePitchClasses(root, voicingIntervals(quality));
}

// ---------------------------------------------------------------------------
// Ortografía
// ---------------------------------------------------------------------------

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11] as const;

export interface SpelledNote {
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

/**
 * Grafía de las 7 notas de una escala, con letras consecutivas desde la tónica
 * (en Eb mayor: Eb F G Ab Bb C D). Sirve de contexto para escribir los acordes
 * de la tonalidad con sus letras: el IV de Eb mayor es Ab, no G#.
 */
export type KeySpelling = readonly SpelledNote[];

/**
 * Escribe una escala de 7 notas con una letra por grado, eligiendo la grafía de
 * la tónica con menos alteraciones (Db mayor antes que C# mayor). Si empatan,
 * gana el sostenido. Para escalas que no tienen 7 notas devuelve null.
 */
export function spellScale(tonic: number, steps: readonly number[]): KeySpelling | null {
  if (steps.length !== 7) return null;
  let best: { notes: SpelledNote[]; cost: number } | null = null;
  for (const t of rootSpellings(pc(tonic))) {
    const notes = steps.map((step, degree) => spellInterval(t, step, degree + 1));
    if (notes.some((n) => Math.abs(n.accidental) > 2)) continue;
    const cost = readabilityCost(notes);
    if (best === null || cost < best.cost) best = { notes, cost };
  }
  return best?.notes ?? null;
}

/** Grafía de una tonalidad del catálogo, o null si la escala no tiene 7 notas. */
export function keySpelling(tonic: number, scale: ScaleId): KeySpelling | null {
  return spellScale(tonic, SCALES[scale].steps);
}

/** Nombre ASCII de una nota deletreada: "Eb", "F#", "E#"… */
export function spelledNoteName(note: SpelledNote): string {
  return spelledName(note);
}

export interface SpelledChord {
  /** Nombre de la raíz elegida, p. ej. "Bb" para A# mayor. */
  readonly root: string;
  /** Notas del acorde en orden de intervalos, p. ej. ["C", "Eb", "G"]. */
  readonly notes: readonly string[];
}

/**
 * Escribe el acorde con la ortografía correcta (cada grado con su letra).
 *
 * Si se da una tonalidad y la raíz pertenece a ella, la raíz toma la letra de
 * la escala. Si no, en teclas negras se elige la grafía de raíz más legible y,
 * si empatan, el sostenido, que es como aparece en la rueda.
 */
export function spellChord(root: number, quality: QualityId, key: KeySpelling | null = null): SpelledChord {
  const def = CHORDS[quality];
  const inKey = key?.find((n) => spelledPc(n) === pc(root));
  let best: { root: SpelledNote; notes: SpelledNote[]; cost: number } | null = null;
  for (const r of inKey ? [inKey] : rootSpellings(pc(root))) {
    const notes = def.intervals.map((iv, k) => spellInterval(r, iv, def.degrees[k]!));
    const cost = readabilityCost(notes);
    if (best === null || cost < best.cost) best = { root: r, notes, cost };
  }
  // rootSpellings siempre devuelve al menos una grafía.
  const chosen = best!;
  return { root: spelledName(chosen.root), notes: chosen.notes.map(spelledName) };
}

/** Nombre del acorde: "C", "Cm", "G7", "Bdim", "Bb"… */
export function chordName(root: number, quality: QualityId, key: KeySpelling | null = null): string {
  return spellChord(root, quality, key).root + CHORDS[quality].suffix;
}

/** Nombres de las notas del acorde con la ortografía correcta: Cm → ["C", "Eb", "G"]. */
export function chordNotes(root: number, quality: QualityId, key: KeySpelling | null = null): string[] {
  return [...spellChord(root, quality, key).notes];
}

/** Convierte "Eb", "F#", "Bbb", "F##" a la forma tipográfica con ♭ ♯ 𝄫 𝄪. */
export function formatNote(name: string): string {
  return name.replace(/##/g, '𝄪').replace(/#/g, '♯').replace(/bb/g, '𝄫').replace(/b/g, '♭');
}

/** Formatea las alteraciones de un sufijo: "m7b5" → "m7♭5", "7#9" → "7♯9". */
export function formatSuffix(suffix: string): string {
  return suffix.replace(/([#b])(?=\d)/g, (s) => (s === '#' ? '♯' : '♭'));
}

/** Formatea un nombre de acorde completo: la raíz ("Bb" → "B♭") y el sufijo ("m7b5" → "m7♭5"). */
export function formatChordName(name: string): string {
  const match = /^([A-G](?:##|#|bb|b)?)(.*)$/.exec(name);
  if (!match) return name;
  return formatNote(match[1]!) + formatSuffix(match[2]!);
}

/** Etiqueta de una calidad en la rueda: el sufijo formateado, o "maj" para la tríada mayor. */
export function qualityLabel(quality: QualityId): string {
  return formatSuffix(CHORDS[quality].suffix) || 'maj';
}

// ---------------------------------------------------------------------------
// Escalas
// ---------------------------------------------------------------------------

export function scalePitchClasses(tonic: number, scale: ScaleId): number[] {
  return SCALES[scale].steps.map((s) => pc(tonic + s));
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
  const pcs = voicingPitchClasses(root, quality);
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
  // Con acordes de más de una octava (add9, extendidos) el bajo debe seguir quedando abajo.
  while (bass >= notes[0]!) bass -= 12;
  return { notes, bass };
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
