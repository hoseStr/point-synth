/**
 * Catálogo de escalas. `steps` son los semitonos desde la tónica.
 *
 * `degrees: true` marca las escalas de 7 notas en las que se puede tocar por
 * grados: apilando terceras dentro de la escala, todas sus tríadas y séptimas
 * existen en el catálogo de acordes (tests/diatonic.test.ts lo verifica). Las
 * demás solo sirven para resaltar notas en la rueda.
 *
 * Ver docs/armonia.md para el carácter y el uso de cada una.
 */

export type ScaleGroup = 'modes' | 'harmonic' | 'pentatonic' | 'symmetric' | 'exotic';

export const SCALE_GROUPS: Record<ScaleGroup, string> = {
  modes: 'Modos de la escala mayor',
  harmonic: 'Menores y armónicas',
  pentatonic: 'Pentatónicas y blues',
  symmetric: 'Simétricas',
  exotic: 'Exóticas',
};

export interface ScaleDef {
  readonly name: string;
  readonly group: ScaleGroup;
  readonly steps: readonly number[];
  readonly degrees: boolean;
  /** Carácter y uso, en una línea. */
  readonly description: string;
}

export const SCALES = {
  major: {
    name: 'Mayor (jónica)',
    group: 'modes',
    steps: [0, 2, 4, 5, 7, 9, 11],
    degrees: true,
    description: 'Brillante y estable: la base del pop y del rock.',
  },
  dorian: {
    name: 'Dórica',
    group: 'modes',
    steps: [0, 2, 3, 5, 7, 9, 10],
    degrees: true,
    description: 'Menor con 6ª mayor: funk, soul, jazz modal.',
  },
  phrygian: {
    name: 'Frigia',
    group: 'modes',
    steps: [0, 1, 3, 5, 7, 8, 10],
    degrees: true,
    description: 'Menor con 2ª menor: oscura, flamenca, metal.',
  },
  lydian: {
    name: 'Lidia',
    group: 'modes',
    steps: [0, 2, 4, 6, 7, 9, 11],
    degrees: true,
    description: 'Mayor con 4ª aumentada: soñadora, de banda sonora.',
  },
  mixolydian: {
    name: 'Mixolidia',
    group: 'modes',
    steps: [0, 2, 4, 5, 7, 9, 10],
    degrees: true,
    description: 'Mayor con 7ª menor: rock clásico, blues, folk.',
  },
  aeolian: {
    name: 'Menor natural (eólica)',
    group: 'modes',
    steps: [0, 2, 3, 5, 7, 8, 10],
    degrees: true,
    description: 'La menor de siempre: melancólica.',
  },
  locrian: {
    name: 'Locria',
    group: 'modes',
    steps: [0, 1, 3, 5, 6, 8, 10],
    degrees: true,
    description: 'Tónica disminuida: inestable, poco usada.',
  },
  harmonicMinor: {
    name: 'Menor armónica',
    group: 'harmonic',
    steps: [0, 2, 3, 5, 7, 8, 11],
    degrees: true,
    description: 'Menor con 7ª mayor: dominante fuerte, aire clásico y oriental.',
  },
  melodicMinor: {
    name: 'Menor melódica',
    group: 'harmonic',
    steps: [0, 2, 3, 5, 7, 9, 11],
    degrees: true,
    description: 'Menor con 6ª y 7ª mayores: muy usada en jazz.',
  },
  harmonicMajor: {
    name: 'Mayor armónica',
    group: 'harmonic',
    steps: [0, 2, 4, 5, 7, 8, 11],
    degrees: true,
    description: 'Mayor con 6ª menor: dramática, el iv menor dentro de una tonalidad mayor.',
  },
  phrygianDominant: {
    name: 'Frigia dominante',
    group: 'harmonic',
    steps: [0, 1, 4, 5, 7, 8, 10],
    degrees: true,
    description: '5º modo de la menor armónica: flamenco, música de Medio Oriente.',
  },
  majorPentatonic: {
    name: 'Pentatónica mayor',
    group: 'pentatonic',
    steps: [0, 2, 4, 7, 9],
    degrees: false,
    description: 'Cinco notas sin semitonos: folk, country, melodías que nunca chocan.',
  },
  minorPentatonic: {
    name: 'Pentatónica menor',
    group: 'pentatonic',
    steps: [0, 3, 5, 7, 10],
    degrees: false,
    description: 'La escala de los solos de rock y blues.',
  },
  blues: {
    name: 'Blues',
    group: 'pentatonic',
    steps: [0, 3, 5, 6, 7, 10],
    degrees: false,
    description: 'Pentatónica menor con la «blue note» (5ª disminuida).',
  },
  wholeTone: {
    name: 'Tonos enteros',
    group: 'symmetric',
    steps: [0, 2, 4, 6, 8, 10],
    degrees: false,
    description: 'Solo tonos enteros: flotante, de sueño (Debussy).',
  },
  diminishedWH: {
    name: 'Disminuida (tono-semitono)',
    group: 'symmetric',
    steps: [0, 2, 3, 5, 6, 8, 9, 11],
    degrees: false,
    description: 'Simétrica de 8 notas, sobre acordes dim7.',
  },
  diminishedHW: {
    name: 'Disminuida (semitono-tono)',
    group: 'symmetric',
    steps: [0, 1, 3, 4, 6, 7, 9, 10],
    degrees: false,
    description: 'Simétrica de 8 notas, sobre dominantes 7♭9.',
  },
  doubleHarmonic: {
    name: 'Doble armónica (bizantina)',
    group: 'exotic',
    steps: [0, 1, 4, 5, 7, 8, 11],
    degrees: false,
    description: 'Dos segundas aumentadas: sonido árabe y bizantino.',
  },
  hungarianMinor: {
    name: 'Húngara menor',
    group: 'exotic',
    steps: [0, 2, 3, 6, 7, 8, 11],
    degrees: false,
    description: 'Menor armónica con 4ª aumentada: gitana, dramática.',
  },
  hirajoshi: {
    name: 'Hirajōshi',
    group: 'exotic',
    steps: [0, 2, 3, 7, 8],
    degrees: false,
    description: 'Pentatónica japonesa, afinación de koto.',
  },
  inSen: {
    name: 'In-sen',
    group: 'exotic',
    steps: [0, 1, 5, 7, 10],
    degrees: false,
    description: 'Pentatónica japonesa con 2ª menor: austera.',
  },
} as const satisfies Record<string, ScaleDef>;

export type ScaleId = keyof typeof SCALES;

export const SCALE_IDS = Object.keys(SCALES) as ScaleId[];

export function isScaleId(value: unknown): value is ScaleId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SCALES, value);
}

export function scaleDef(id: ScaleId): ScaleDef {
  return SCALES[id];
}
