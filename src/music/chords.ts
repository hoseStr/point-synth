/**
 * Catálogo de acordes. Es la única fuente de verdad: para añadir un acorde a
 * la app basta con añadirlo aquí; aparece en el editor de la rueda y se puede
 * reconocer en el modo por grados.
 *
 * - `intervals`: semitonos desde la raíz (14 = novena, 17 = oncena, 21 = trecena).
 * - `degrees`: grado de cada intervalo (1, 3, 5, 7, 9…). Decide la LETRA de cada
 *   nota: la tercera de C es una E, así que Cm se escribe C–Eb–G y no C–D#–G.
 * - `suffix`: lo que va tras la raíz en el nombre, en ASCII ("m7b5"); la interfaz
 *   lo muestra con ♭ y ♯.
 *
 * Ver docs/armonia.md para la teoría detrás de cada fórmula.
 */

export type ChordCategory = 'triad' | 'sixth' | 'seventh' | 'added' | 'extended';

export const CHORD_CATEGORIES: Record<ChordCategory, string> = {
  triad: 'Tríadas',
  sixth: 'Sextas',
  seventh: 'Séptimas',
  added: 'Añadidos',
  extended: 'Novenas y extendidos',
};

export interface ChordDef {
  /** Nombre en español. */
  readonly name: string;
  readonly category: ChordCategory;
  readonly intervals: readonly number[];
  readonly degrees: readonly number[];
  readonly suffix: string;
}

export const CHORDS = {
  // Tríadas
  maj: { name: 'Mayor', category: 'triad', intervals: [0, 4, 7], degrees: [1, 3, 5], suffix: '' },
  m: { name: 'Menor', category: 'triad', intervals: [0, 3, 7], degrees: [1, 3, 5], suffix: 'm' },
  dim: { name: 'Disminuido', category: 'triad', intervals: [0, 3, 6], degrees: [1, 3, 5], suffix: 'dim' },
  aug: { name: 'Aumentado', category: 'triad', intervals: [0, 4, 8], degrees: [1, 3, 5], suffix: 'aug' },
  sus2: { name: 'Suspendido de 2ª', category: 'triad', intervals: [0, 2, 7], degrees: [1, 2, 5], suffix: 'sus2' },
  sus4: { name: 'Suspendido de 4ª', category: 'triad', intervals: [0, 5, 7], degrees: [1, 4, 5], suffix: 'sus4' },
  '5': { name: 'Quinta (power chord)', category: 'triad', intervals: [0, 7], degrees: [1, 5], suffix: '5' },

  // Sextas
  '6': { name: 'Sexta', category: 'sixth', intervals: [0, 4, 7, 9], degrees: [1, 3, 5, 6], suffix: '6' },
  m6: { name: 'Menor sexta', category: 'sixth', intervals: [0, 3, 7, 9], degrees: [1, 3, 5, 6], suffix: 'm6' },
  '6/9': { name: 'Sexta y novena', category: 'sixth', intervals: [0, 4, 7, 9, 14], degrees: [1, 3, 5, 6, 9], suffix: '6/9' },

  // Séptimas
  maj7: { name: 'Mayor séptima', category: 'seventh', intervals: [0, 4, 7, 11], degrees: [1, 3, 5, 7], suffix: 'maj7' },
  '7': { name: 'Séptima de dominante', category: 'seventh', intervals: [0, 4, 7, 10], degrees: [1, 3, 5, 7], suffix: '7' },
  m7: { name: 'Menor séptima', category: 'seventh', intervals: [0, 3, 7, 10], degrees: [1, 3, 5, 7], suffix: 'm7' },
  m7b5: { name: 'Semidisminuido (ø)', category: 'seventh', intervals: [0, 3, 6, 10], degrees: [1, 3, 5, 7], suffix: 'm7b5' },
  dim7: { name: 'Disminuido séptima (°7)', category: 'seventh', intervals: [0, 3, 6, 9], degrees: [1, 3, 5, 7], suffix: 'dim7' },
  mMaj7: { name: 'Menor con séptima mayor', category: 'seventh', intervals: [0, 3, 7, 11], degrees: [1, 3, 5, 7], suffix: 'm(maj7)' },
  'maj7#5': { name: 'Mayor séptima aumentado', category: 'seventh', intervals: [0, 4, 8, 11], degrees: [1, 3, 5, 7], suffix: 'maj7#5' },
  '7#5': { name: 'Séptima aumentada', category: 'seventh', intervals: [0, 4, 8, 10], degrees: [1, 3, 5, 7], suffix: '7#5' },
  '7b5': { name: 'Séptima con 5ª disminuida', category: 'seventh', intervals: [0, 4, 6, 10], degrees: [1, 3, 5, 7], suffix: '7b5' },
  '7sus4': { name: 'Séptima suspendida', category: 'seventh', intervals: [0, 5, 7, 10], degrees: [1, 4, 5, 7], suffix: '7sus4' },

  // Añadidos
  add9: { name: 'Añadida novena', category: 'added', intervals: [0, 4, 7, 14], degrees: [1, 3, 5, 9], suffix: 'add9' },
  madd9: { name: 'Menor añadida novena', category: 'added', intervals: [0, 3, 7, 14], degrees: [1, 3, 5, 9], suffix: 'madd9' },

  // Novenas y extendidos
  maj9: { name: 'Mayor novena', category: 'extended', intervals: [0, 4, 7, 11, 14], degrees: [1, 3, 5, 7, 9], suffix: 'maj9' },
  '9': { name: 'Novena de dominante', category: 'extended', intervals: [0, 4, 7, 10, 14], degrees: [1, 3, 5, 7, 9], suffix: '9' },
  m9: { name: 'Menor novena', category: 'extended', intervals: [0, 3, 7, 10, 14], degrees: [1, 3, 5, 7, 9], suffix: 'm9' },
  mMaj9: { name: 'Menor novena con séptima mayor', category: 'extended', intervals: [0, 3, 7, 11, 14], degrees: [1, 3, 5, 7, 9], suffix: 'm(maj9)' },
  m9b5: { name: 'Semidisminuido con novena', category: 'extended', intervals: [0, 3, 6, 10, 14], degrees: [1, 3, 5, 7, 9], suffix: 'm9b5' },
  '7b9': { name: 'Séptima con 9ª menor', category: 'extended', intervals: [0, 4, 7, 10, 13], degrees: [1, 3, 5, 7, 9], suffix: '7b9' },
  '7#9': { name: 'Séptima con 9ª aumentada (Hendrix)', category: 'extended', intervals: [0, 4, 7, 10, 15], degrees: [1, 3, 5, 7, 9], suffix: '7#9' },
  m7b9: { name: 'Menor séptima con 9ª menor', category: 'extended', intervals: [0, 3, 7, 10, 13], degrees: [1, 3, 5, 7, 9], suffix: 'm7b9' },
  '9sus4': { name: 'Novena suspendida', category: 'extended', intervals: [0, 5, 7, 10, 14], degrees: [1, 4, 5, 7, 9], suffix: '9sus4' },
  'maj7#11': { name: 'Mayor séptima con 11ª aumentada (lidio)', category: 'extended', intervals: [0, 4, 7, 11, 18], degrees: [1, 3, 5, 7, 11], suffix: 'maj7#11' },
  m11: { name: 'Menor oncena', category: 'extended', intervals: [0, 3, 7, 10, 14, 17], degrees: [1, 3, 5, 7, 9, 11], suffix: 'm11' },
  // En la trecena de dominante se omite la 11ª: chocaría con la tercera mayor.
  '13': { name: 'Trecena de dominante', category: 'extended', intervals: [0, 4, 7, 10, 14, 21], degrees: [1, 3, 5, 7, 9, 13], suffix: '13' },
  maj13: { name: 'Mayor trecena', category: 'extended', intervals: [0, 4, 7, 11, 14, 21], degrees: [1, 3, 5, 7, 9, 13], suffix: 'maj13' },
} as const satisfies Record<string, ChordDef>;

export type QualityId = keyof typeof CHORDS;

/**
 * Orden del catálogo (el del editor y la documentación). Es explícito porque
 * JavaScript ordena primero las claves numéricas ('5', '7', '13') de un objeto.
 */
export const QUALITY_IDS: readonly QualityId[] = [
  'maj', 'm', 'dim', 'aug', 'sus2', 'sus4', '5',
  '6', 'm6', '6/9',
  'maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7', 'maj7#5', '7#5', '7b5', '7sus4',
  'add9', 'madd9',
  'maj9', '9', 'm9', 'mMaj9', 'm9b5', '7b9', '7#9', 'm7b9', '9sus4', 'maj7#11', 'm11', '13', 'maj13',
];

export function isQualityId(value: unknown): value is QualityId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CHORDS, value);
}

export function chordDef(id: QualityId): ChordDef {
  return CHORDS[id];
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

/**
 * Intervalos que realmente suenan. Con 5 o más notas se omite la quinta justa:
 * casi no aporta color y amontona el acorde (práctica habitual en piano y guitarra).
 */
export function voicingIntervals(id: QualityId): readonly number[] {
  const intervals: readonly number[] = CHORDS[id].intervals;
  if (intervals.length < 5 || !intervals.includes(7)) return intervals;
  return intervals.filter((i) => i !== 7);
}

/** Notas simultáneas máximas del catálogo (sin contar el bajo): dimensiona el pool de voces. */
export const MAX_VOICING_NOTES = Math.max(...QUALITY_IDS.map((id) => voicingIntervals(id).length));

/** Clases de altura relativas a la raíz, ordenadas y sin repetir. */
function pcSet(intervals: readonly number[]): string {
  return [...new Set(intervals.map(mod12))].sort((a, b) => a - b).join(',');
}

const BY_EXACT = new Map(QUALITY_IDS.map((id) => [CHORDS[id].intervals.join(','), id]));
const BY_PC_SET = new Map(QUALITY_IDS.map((id) => [pcSet(CHORDS[id].intervals), id]));

/**
 * Reconoce un acorde por sus intervalos desde la raíz. Primero busca la fórmula
 * exacta; si no, el mismo conjunto de notas en cualquier octava. null si no
 * está en el catálogo.
 */
export function matchQuality(intervals: readonly number[]): QualityId | null {
  return BY_EXACT.get(intervals.join(',')) ?? BY_PC_SET.get(pcSet(intervals)) ?? null;
}
