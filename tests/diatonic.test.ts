import { describe, expect, it } from 'vitest';
import {
  DEGREE_TYPE_IDS,
  degreeLabels,
  diatonicChord,
  romanNumeral,
  type DegreeTypeId,
} from '../src/music/diatonic';
import { SCALES, SCALE_IDS, type ScaleId } from '../src/music/scales';
import { chordName, chordNotes, keySpelling } from '../src/music/theory';

const C = 0, D = 2, G = 7, A = 9;

/** Nombres de los 7 acordes de una tonalidad, escritos en esa tonalidad. */
function chordsOf(tonic: number, scale: ScaleId, type: DegreeTypeId): string[] {
  const key = keySpelling(tonic, scale);
  return [0, 1, 2, 3, 4, 5, 6].map((d) => {
    const c = diatonicChord(tonic, scale, d, type);
    return chordName(c.root, c.quality, key);
  });
}

function numeralsOf(tonic: number, scale: ScaleId, type: DegreeTypeId): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => diatonicChord(tonic, scale, d, type).numeral);
}

describe('catálogo de escalas', () => {
  it('escalas bien formadas', () => {
    for (const id of SCALE_IDS) {
      const steps = SCALES[id].steps as readonly number[];
      expect(steps[0], id).toBe(0);
      for (let k = 1; k < steps.length; k++) expect(steps[k]!, id).toBeGreaterThan(steps[k - 1]!);
      expect(steps.at(-1)!, id).toBeLessThan(12);
    }
    expect(new Set(SCALE_IDS.map((id) => SCALES[id].name)).size).toBe(SCALE_IDS.length);
  });

  it('las escalas con modo por grados tienen todas sus tríadas y séptimas en el catálogo', () => {
    for (const id of SCALE_IDS.filter((s) => SCALES[s].degrees)) {
      expect(SCALES[id].steps.length, id).toBe(7);
      for (let d = 0; d < 7; d++) {
        for (const type of ['triad', 'seventh'] as const) {
          expect(diatonicChord(C, id, d, type).fallback, `${id} grado ${d + 1} ${type}`).toBe(false);
        }
      }
    }
  });

  it('las escalas de 7 notas sin modo por grados de verdad no lo admiten', () => {
    for (const id of ['doubleHarmonic', 'hungarianMinor'] as const) {
      const fails = [0, 1, 2, 3, 4, 5, 6].some((d) => diatonicChord(C, id, d, 'triad').fallback);
      expect(fails, id).toBe(true);
    }
  });
});

describe('acordes diatónicos', () => {
  it('C mayor: tríadas, séptimas y números romanos', () => {
    expect(chordsOf(C, 'major', 'triad')).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
    expect(chordsOf(C, 'major', 'seventh')).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
    expect(numeralsOf(C, 'major', 'triad')).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(numeralsOf(C, 'major', 'seventh')).toEqual(['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
  });

  it('A menor natural', () => {
    expect(chordsOf(A, 'aeolian', 'triad')).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
    expect(numeralsOf(A, 'aeolian', 'triad')).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  });

  it('A menor armónica', () => {
    expect(chordsOf(A, 'harmonicMinor', 'triad')).toEqual(['Am', 'Bdim', 'Caug', 'Dm', 'E', 'F', 'G#dim']);
    expect(chordsOf(A, 'harmonicMinor', 'seventh')).toEqual([
      'Am(maj7)',
      'Bm7b5',
      'Cmaj7#5',
      'Dm7',
      'E7',
      'Fmaj7',
      'G#dim7',
    ]);
    expect(numeralsOf(A, 'harmonicMinor', 'triad')).toEqual(['i', 'ii°', 'III+', 'iv', 'V', 'VI', 'vii°']);
  });

  it('C menor melódica', () => {
    expect(chordsOf(C, 'melodicMinor', 'triad')).toEqual(['Cm', 'Dm', 'Ebaug', 'F', 'G', 'Adim', 'Bdim']);
  });

  it('D dórica y G mixolidia (modos de C mayor) comparten acordes con C mayor', () => {
    expect(chordsOf(D, 'dorian', 'triad')).toEqual(['Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'C']);
    expect(chordsOf(G, 'mixolydian', 'triad')).toEqual(['G', 'Am', 'Bdim', 'C', 'Dm', 'Em', 'F']);
  });

  it('novenas: las que existen y la que cae a la tríada', () => {
    expect(chordsOf(C, 'major', 'ninth').slice(0, 6)).toEqual(['Cmaj9', 'Dm9', 'Em7b9', 'Fmaj9', 'G9', 'Am9']);
    // B D F A C: no es un acorde del catálogo → suena Bdim.
    const vii = diatonicChord(C, 'major', 6, 'ninth');
    expect(vii.fallback).toBe(true);
    expect(vii.quality).toBe('dim');
  });

  it('variantes: sus4 del IV en mayor tendría 4ª aumentada → tríada', () => {
    expect(diatonicChord(C, 'major', 0, 'sus4')).toMatchObject({ quality: 'sus4', fallback: false });
    expect(diatonicChord(C, 'major', 3, 'sus4')).toMatchObject({ quality: 'maj', fallback: true });
    expect(diatonicChord(C, 'major', 1, 'sixth').quality).toBe('m6');
    expect(diatonicChord(C, 'major', 4, 'power').quality).toBe('5');
  });

  it('todas las variantes existen como tipo', () => {
    expect(DEGREE_TYPE_IDS).toEqual(['triad', 'seventh', 'ninth', 'sus2', 'sus4', 'add9', 'sixth', 'power']);
  });
});

describe('ortografía en tonalidad', () => {
  const name = (tonic: number, scale: ScaleId, degree: number, type: DegreeTypeId = 'triad'): string => {
    const c = diatonicChord(tonic, scale, degree, type);
    return chordName(c.root, c.quality, keySpelling(tonic, scale));
  };

  it('cada grado lleva su letra', () => {
    expect(name(3, 'major', 3)).toBe('Ab'); // IV de Eb mayor, no G#
    expect(name(6, 'major', 6)).toBe('E#dim'); // vii de F# mayor
    expect(name(D, 'aeolian', 5)).toBe('Bb'); // VI de D menor
    expect(name(1, 'major', 1)).toBe('Ebm'); // ii de Db mayor
  });

  it('la tónica se escribe con la grafía de menos alteraciones', () => {
    const tonicName = (t: number, s: ScaleId): string => chordNotes(t, 'maj', keySpelling(t, s))[0]!;
    expect(tonicName(1, 'major')).toBe('Db');
    expect(tonicName(10, 'major')).toBe('Bb');
    expect(tonicName(8, 'major')).toBe('Ab');
    expect(tonicName(6, 'major')).toBe('F#');
    expect(tonicName(1, 'aeolian')).toBe('C#');
  });

  it('las notas del acorde también siguen la tonalidad', () => {
    const c = diatonicChord(6, 'major', 6, 'triad');
    expect(chordNotes(c.root, c.quality, keySpelling(6, 'major'))).toEqual(['E#', 'G#', 'B']);
  });

  it('etiquetas de la rueda de grados en G mayor', () => {
    const labels = degreeLabels(G, 'major');
    expect(labels.map((l) => l.numeral)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(labels.map((l) => l.note)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F♯']);
  });
});

describe('números romanos', () => {
  it('casos especiales', () => {
    expect(romanNumeral(6, 'dim7')).toBe('vii°7');
    expect(romanNumeral(2, 'maj7#5')).toBe('III+maj7');
    expect(romanNumeral(0, 'mMaj7')).toBe('i(maj7)');
    expect(romanNumeral(2, 'm7b9')).toBe('iii7♭9');
    expect(romanNumeral(4, '7sus4')).toBe('V7sus4');
  });

  it('acordes sin tercera toman la mayúscula o minúscula de la tríada del grado', () => {
    expect(diatonicChord(A, 'aeolian', 0, 'sus4').numeral).toBe('isus4');
    expect(diatonicChord(C, 'major', 4, 'sus4').numeral).toBe('Vsus4');
    expect(diatonicChord(C, 'major', 1, 'power').numeral).toBe('ii5');
  });
});

