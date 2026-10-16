import { describe, expect, it } from 'vitest';
import {
  chordIntervals,
  chordName,
  chordNotes,
  formatChordName,
  formatNote,
  movementCost,
  octaveStart,
  pc,
  scalePitchClasses,
  voiceChord,
  type QualityId,
  type Voicing,
} from '../src/music/theory';

const C = 0, D = 2, E = 4, F = 5, G = 7, A = 9, B = 11;

describe('intervalos', () => {
  it.each<[QualityId, number[]]>([
    ['maj', [0, 4, 7]],
    ['m', [0, 3, 7]],
    ['7', [0, 4, 7, 10]],
    ['maj7', [0, 4, 7, 11]],
    ['m7', [0, 3, 7, 10]],
    ['dim', [0, 3, 6]],
    ['aug', [0, 4, 8]],
    ['sus4', [0, 5, 7]],
  ])('%s → %j', (quality, intervals) => {
    expect(chordIntervals(quality)).toEqual(intervals);
  });
});

describe('chordName', () => {
  it.each<[number, QualityId, string]>([
    [C, 'maj', 'C'],
    [C, 'm', 'Cm'],
    [B, 'maj', 'B'],
    [6, 'm', 'F#m'],
    [B, 'dim', 'Bdim'],
    [G, '7', 'G7'],
    [C, 'maj7', 'Cmaj7'],
    [A, 'm7', 'Am7'],
    [C, 'aug', 'Caug'],
    [D, 'sus4', 'Dsus4'],
  ])('raíz %i + %s → %s', (root, quality, name) => {
    expect(chordName(root, quality)).toBe(name);
  });

  it('en teclas negras usa la grafía más legible', () => {
    expect(chordName(10, 'maj')).toBe('Bb'); // A# C## E# sería ilegible
    expect(chordName(8, 'maj')).toBe('Ab');
    expect(chordName(3, 'maj')).toBe('Eb');
    expect(chordName(1, 'maj')).toBe('Db');
    expect(chordName(10, 'm')).toBe('Bbm');
  });

  it('si empatan, conserva el sostenido de la rueda', () => {
    expect(chordName(6, 'maj')).toBe('F#'); // F# A# C# vs Gb Bb Db
    expect(chordName(3, 'm')).toBe('D#m'); // D# F# A# vs Eb Gb Bb
    expect(chordName(1, 'm')).toBe('C#m');
    expect(chordName(8, 'm')).toBe('G#m');
  });
});

describe('chordNotes (ortografía)', () => {
  it.each<[number, QualityId, string[]]>([
    [C, 'm', ['C', 'Eb', 'G']],
    [B, 'maj', ['B', 'D#', 'F#']],
    [6, 'm', ['F#', 'A', 'C#']],
    [B, 'dim', ['B', 'D', 'F']],
    [G, 'maj', ['G', 'B', 'D']],
    [C, 'maj', ['C', 'E', 'G']],
    [G, '7', ['G', 'B', 'D', 'F']],
    [F, 'maj7', ['F', 'A', 'C', 'E']],
    [D, 'm7', ['D', 'F', 'A', 'C']],
    [C, 'aug', ['C', 'E', 'G#']],
    [C, 'dim', ['C', 'Eb', 'Gb']],
    [E, 'sus4', ['E', 'A', 'B']],
    [10, 'maj', ['Bb', 'D', 'F']],
    [3, 'm', ['D#', 'F#', 'A#']],
  ])('raíz %i + %s → %j', (root, quality, notes) => {
    expect(chordNotes(root, quality)).toEqual(notes);
  });

  it('formatea alteraciones con símbolos', () => {
    expect(formatNote('Eb')).toBe('E♭');
    expect(formatNote('F#')).toBe('F♯');
    expect(formatNote('B')).toBe('B');
    expect(formatChordName('Bbm7')).toBe('B♭m7');
    expect(formatChordName('C#dim')).toBe('C♯dim');
    expect(formatChordName('Cmaj7')).toBe('Cmaj7');
  });
});

describe('escalas', () => {
  it('G mayor', () => {
    expect(scalePitchClasses(G, 'major')).toEqual([7, 9, 11, 0, 2, 4, 6]);
  });
  it('A menor natural', () => {
    expect(scalePitchClasses(A, 'aeolian')).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });
});

describe('movementCost', () => {
  it('mismo tamaño: emparejamiento ordenado', () => {
    expect(movementCost([60, 64, 67], [60, 63, 67])).toBe(1);
  });
  it('tamaños distintos: la nota extra cuesta su distancia a la más cercana', () => {
    // C → C7 en la misma posición: Bb queda a 3 semitonos de G.
    expect(movementCost([60, 64, 67], [60, 64, 67, 70])).toBe(3);
  });
});

/** Toca una progresión y devuelve los voicings, encadenando el voice leading. */
function play(progression: [number, QualityId][], baseOctave = 4): Voicing[] {
  const out: Voicing[] = [];
  let prev: readonly number[] | null = null;
  for (const [root, quality] of progression) {
    const v = voiceChord(root, quality, prev, baseOctave);
    out.push(v);
    prev = v.notes;
  }
  return out;
}

describe('voice leading', () => {
  const creep: [number, QualityId][] = [
    [G, 'maj'],
    [B, 'maj'],
    [C, 'maj'],
    [C, 'm'],
  ];

  it('cada voicing contiene exactamente las notas del acorde', () => {
    const voicings = play(creep);
    creep.forEach(([root, quality], k) => {
      const pcs = voicings[k]!.notes.map(pc).sort((x, y) => x - y);
      const expected = chordIntervals(quality).map((i) => pc(root + i)).sort((x, y) => x - y);
      expect(pcs).toEqual(expected);
    });
  });

  it('Creep (G → B → C → Cm) produce movimientos pequeños', () => {
    const voicings = play(creep);
    for (let k = 1; k < voicings.length; k++) {
      const cost = movementCost(voicings[k - 1]!.notes, voicings[k]!.notes);
      expect(cost).toBeLessThanOrEqual(4);
    }
  });

  it('Creep: el voicing esperado nota a nota', () => {
    const [g, b, c, cm] = play(creep).map((v) => v.notes);
    expect(g).toEqual([55, 59, 62]); // G3 B3 D4
    expect(b).toEqual([54, 59, 63]); // F#3 B3 D#4
    expect(c).toEqual([55, 60, 64]); // G3 C4 E4
    expect(cm).toEqual([55, 60, 63]); // G3 C4 Eb4
  });

  it('de C a Cm solo se mueve una nota, E → Eb', () => {
    const [, , c, cm] = play(creep);
    const changed = c!.notes.filter((n) => !cm!.notes.includes(n));
    const added = cm!.notes.filter((n) => !c!.notes.includes(n));
    expect(changed.map(pc)).toEqual([E]);
    expect(added.map(pc)).toEqual([3]);
    expect(Math.abs(changed[0]! - added[0]!)).toBe(1);
    expect(cm!.bass).toBe(c!.bass);
  });

  it('el bajo es la raíz y queda debajo del voicing', () => {
    for (const v of play(creep)) {
      expect(v.bass).toBeLessThan(v.notes[0]!);
    }
    const [g, b, c] = play(creep);
    expect(pc(g!.bass)).toBe(G);
    expect(pc(b!.bass)).toBe(B);
    expect(pc(c!.bass)).toBe(C);
  });

  it('sin acorde anterior usa posición fundamental', () => {
    const v = voiceChord(C, 'maj', null, 4);
    expect(v.notes).toEqual([60, 64, 67]);
    expect(v.bass).toBe(48);
  });

  it('no se desplaza de registro en progresiones largas', () => {
    const cycle: [number, QualityId][] = [];
    // Ciclo de quintas varias veces: el caso típico de deriva.
    for (let k = 0; k < 48; k++) cycle.push([pc(k * 7), k % 2 ? 'm7' : '7']);
    for (const baseOctave of [2, 3, 4, 5]) {
      const baseC = octaveStart(baseOctave);
      for (const v of play(cycle, baseOctave)) {
        expect(v.notes[0]!).toBeGreaterThanOrEqual(baseC - 8);
        expect(v.notes[0]!).toBeLessThanOrEqual(baseC + 9);
      }
    }
  });

  it('las notas comunes se mantienen en su lugar', () => {
    // C → Am: C y E se quedan, G sube a A.
    const [c, am] = play([
      [C, 'maj'],
      [A, 'm'],
    ]);
    expect(am!.notes).toContain(60);
    expect(am!.notes).toContain(64);
    expect(movementCost(c!.notes, am!.notes)).toBe(2);
  });
});
