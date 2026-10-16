import { describe, expect, it } from 'vitest';
import { CHORDS, MAX_VOICING_NOTES, QUALITY_IDS, matchQuality, voicingIntervals } from '../src/music/chords';
import { chordNotes, formatChordName, qualityLabel } from '../src/music/theory';

const pcSet = (intervals: readonly number[]): string =>
  [...new Set(intervals.map((i) => i % 12))].sort((a, b) => a - b).join(',');

describe('catálogo de acordes', () => {
  it('QUALITY_IDS lista cada acorde del catálogo una sola vez', () => {
    expect([...QUALITY_IDS].sort()).toEqual(Object.keys(CHORDS).sort());
    expect(QUALITY_IDS[0]).toBe('maj');
  });

  it('sufijos y conjuntos de notas únicos', () => {
    const suffixes = QUALITY_IDS.map((id) => CHORDS[id].suffix);
    expect(new Set(suffixes).size).toBe(QUALITY_IDS.length);
    const sets = QUALITY_IDS.map((id) => pcSet(CHORDS[id].intervals));
    expect(new Set(sets).size).toBe(QUALITY_IDS.length);
  });

  it('fórmulas bien formadas: empiezan en 0, ascendentes y con un grado por intervalo', () => {
    for (const id of QUALITY_IDS) {
      const { intervals, degrees } = CHORDS[id];
      expect(intervals[0], id).toBe(0);
      expect(degrees.length, id).toBe(intervals.length);
      for (let k = 1; k < intervals.length; k++) {
        expect(intervals[k]!, id).toBeGreaterThan(intervals[k - 1]!);
        expect(degrees[k]!, id).toBeGreaterThan(degrees[k - 1]!);
      }
    }
  });

  it('cada acorde se escribe sin triples alteraciones en las 12 raíces', () => {
    for (const id of QUALITY_IDS) {
      for (let root = 0; root < 12; root++) {
        for (const name of chordNotes(root, id)) expect(name, `${root} ${id}`).toMatch(/^[A-G](#{0,2}|b{0,2})$/);
      }
    }
  });

  it('matchQuality reconoce cada fórmula del catálogo', () => {
    for (const id of QUALITY_IDS) expect(matchQuality(CHORDS[id].intervals)).toBe(id);
    // Mismas notas en otra octava: la novena como segunda.
    expect(matchQuality([0, 2, 4, 7])).toBe('add9');
    expect(matchQuality([0, 1, 2])).toBeNull();
  });

  it('con 5 o más notas el voicing omite la quinta justa', () => {
    expect(voicingIntervals('maj')).toEqual([0, 4, 7]);
    expect(voicingIntervals('maj9')).toEqual([0, 4, 11, 14]);
    expect(voicingIntervals('m11')).toEqual([0, 3, 10, 14, 17]);
    expect(voicingIntervals('m9b5')).toEqual([0, 3, 6, 10, 14]); // quinta disminuida: se queda
    expect(MAX_VOICING_NOTES).toBe(5);
  });
});

describe('ortografía de acordes extendidos y alterados', () => {
  it.each([
    [0, '13', ['C', 'E', 'G', 'Bb', 'D', 'A']],
    [0, 'm7b5', ['C', 'Eb', 'Gb', 'Bb']],
    [0, '7#9', ['C', 'E', 'G', 'Bb', 'D#']],
    [0, '7b9', ['C', 'E', 'G', 'Bb', 'Db']],
    [0, 'maj7#11', ['C', 'E', 'G', 'B', 'F#']],
    [9, 'mMaj7', ['A', 'C', 'E', 'G#']],
    [7, '6/9', ['G', 'B', 'D', 'E', 'A']],
    [2, 'm11', ['D', 'F', 'A', 'C', 'E', 'G']],
  ] as const)('raíz %i + %s → %j', (root, id, notes) => {
    expect(chordNotes(root, id)).toEqual(notes);
  });
});

describe('formato', () => {
  it('alteraciones de la raíz y del sufijo', () => {
    expect(formatChordName('Bbm7b5')).toBe('B♭m7♭5');
    expect(formatChordName('C7#9')).toBe('C7♯9');
    expect(formatChordName('F#maj7#11')).toBe('F♯maj7♯11');
    expect(formatChordName('C6/9')).toBe('C6/9');
    expect(formatChordName('Cmadd9')).toBe('Cmadd9');
  });

  it('etiquetas de la rueda', () => {
    expect(qualityLabel('maj')).toBe('maj');
    expect(qualityLabel('m7b5')).toBe('m7♭5');
    expect(qualityLabel('mMaj7')).toBe('m(maj7)');
  });
});
