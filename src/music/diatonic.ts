/**
 * Acordes diatónicos: tocar "por grados" dentro de una tonalidad (puro).
 *
 * El acorde del grado i se arma apilando terceras dentro de la escala: notas
 * i, i+2, i+4 (+6 para la séptima, +8 para la novena). Así todo lo que suena
 * pertenece a la tonalidad. Las variantes (sus2, sus4, add9, 6, 5) también toman
 * sus notas de la escala; si el resultado no es un acorde del catálogo (por
 * ejemplo el IV sus4 en mayor, que tendría una 4ª aumentada), suena la tríada.
 */
import { CHORDS, matchQuality, type QualityId } from './chords';
import { SCALES, type ScaleId } from './scales';
import { formatNote, formatSuffix, keySpelling, pc, spelledNoteName } from './theory';

export interface DegreeTypeDef {
  readonly name: string;
  /** Etiqueta corta para la rueda. */
  readonly label: string;
  /** Pasos de escala desde el grado: 0 = el grado, 2 = su tercera, 4 = su quinta… */
  readonly steps: readonly number[];
}

export const DEGREE_TYPES = {
  triad: { name: 'Tríada', label: 'Tríada', steps: [0, 2, 4] },
  seventh: { name: 'Séptima', label: '7ª', steps: [0, 2, 4, 6] },
  ninth: { name: 'Novena', label: '9ª', steps: [0, 2, 4, 6, 8] },
  sus2: { name: 'Suspendido de 2ª', label: 'sus2', steps: [0, 1, 4] },
  sus4: { name: 'Suspendido de 4ª', label: 'sus4', steps: [0, 3, 4] },
  add9: { name: 'Añadida novena', label: 'add9', steps: [0, 2, 4, 8] },
  sixth: { name: 'Sexta', label: '6', steps: [0, 2, 4, 5] },
  power: { name: 'Quinta (power chord)', label: '5', steps: [0, 4] },
} as const satisfies Record<string, DegreeTypeDef>;

export type DegreeTypeId = keyof typeof DEGREE_TYPES;

export const DEGREE_TYPE_IDS = Object.keys(DEGREE_TYPES) as DegreeTypeId[];

export function isDegreeTypeId(value: unknown): value is DegreeTypeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DEGREE_TYPES, value);
}

export function supportsDegrees(scale: ScaleId): boolean {
  return SCALES[scale].degrees;
}

/** Intervalos (en semitonos desde el grado) de las notas de escala indicadas por `offsets`. */
export function stackIntervals(steps: readonly number[], degree: number, offsets: readonly number[]): number[] {
  const n = steps.length;
  const base = steps[degree]!;
  return offsets.map((k) => steps[(degree + k) % n]! + 12 * Math.floor((degree + k) / n) - base);
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

/** Sufijos propios de la notación con números romanos. */
const NUMERAL_SUFFIX: Partial<Record<QualityId, string>> = {
  maj: '',
  m: '',
  dim: '°',
  aug: '+',
  m7b5: 'ø7',
  m9b5: 'ø9',
  dim7: '°7',
  'maj7#5': '+maj7',
  '7#5': '+7',
  mMaj7: '(maj7)',
  mMaj9: '(maj9)',
};

function hasThird(quality: QualityId): boolean {
  const intervals = CHORDS[quality].intervals as readonly number[];
  return intervals.includes(3) || intervals.includes(4);
}

function isMinorThird(quality: QualityId): boolean {
  const intervals = CHORDS[quality].intervals as readonly number[];
  return intervals.includes(3) && !intervals.includes(4);
}

/**
 * Número romano del acorde: mayúscula si tiene tercera mayor, minúscula si es
 * menor; ° disminuido, + aumentado, ø semidisminuido. Los acordes sin tercera
 * (sus, 5) toman la mayúscula o minúscula de la tríada del grado (`triad`):
 * en A menor, el sus4 del primer grado es «isus4».
 * Relativo a la escala elegida: en menor natural, i ii° III iv v VI VII.
 */
export function romanNumeral(degree: number, quality: QualityId, triad: QualityId = quality): string {
  const minor = isMinorThird(hasThird(quality) ? quality : triad);
  const base = minor ? ROMAN[degree]!.toLowerCase() : ROMAN[degree]!;
  const suffix = NUMERAL_SUFFIX[quality] ?? (minor ? CHORDS[quality].suffix.replace(/^m/, '') : CHORDS[quality].suffix);
  return base + formatSuffix(suffix);
}

export interface DiatonicChord {
  /** Clase de altura de la raíz (0 = C). */
  readonly root: number;
  readonly quality: QualityId;
  /** Número romano formateado, p. ej. "ii7", "viiø7", "V". */
  readonly numeral: string;
  /** true si la variante pedida no existe en esta escala y suena la tríada. */
  readonly fallback: boolean;
}

/** Tríada del grado (siempre existe en las escalas con `degrees: true`). */
function triadOf(steps: readonly number[], degree: number): QualityId {
  return matchQuality(stackIntervals(steps, degree, DEGREE_TYPES.triad.steps)) ?? 'maj';
}

export function diatonicChord(tonic: number, scale: ScaleId, degree: number, type: DegreeTypeId): DiatonicChord {
  const steps = SCALES[scale].steps;
  const matched = matchQuality(stackIntervals(steps, degree, DEGREE_TYPES[type].steps));
  const triad = triadOf(steps, degree);
  const quality = matched ?? triad;
  return {
    root: pc(tonic + steps[degree]!),
    quality,
    numeral: romanNumeral(degree, quality, triad),
    fallback: matched === null,
  };
}

export interface DegreeLabel {
  /** Número romano de la tríada del grado: "I", "ii", "vii°". */
  readonly numeral: string;
  /** Nota del grado escrita en la tonalidad y formateada: "F♯". */
  readonly note: string;
}

/** Etiquetas de la rueda de grados para una tonalidad. */
export function degreeLabels(tonic: number, scale: ScaleId): DegreeLabel[] {
  const steps = SCALES[scale].steps;
  const spelling = keySpelling(tonic, scale);
  return steps.map((step, degree) => ({
    numeral: romanNumeral(degree, triadOf(steps, degree)),
    note: formatNote(spelling ? spelledNoteName(spelling[degree]!) : String(pc(tonic + step))),
  }));
}
