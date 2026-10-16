import { describe, expect, it } from 'vitest';
import { planVoices } from '../src/audio/allocate';

describe('planVoices', () => {
  it('desde silencio, todas las notas atacan', () => {
    const steps = planVoices([null, null, null, null, null], [43, 55, 59, 62]);
    expect(steps.filter((s) => s.kind === 'attack')).toHaveLength(4);
    expect(steps.filter((s) => s.kind === 'idle')).toHaveLength(1);
  });

  it('C → Cm: solo la tercera se desliza, el resto no se toca', () => {
    // bajo C3, voicing G3 C4 E4 → G3 C4 Eb4
    const steps = planVoices([48, 55, 60, 64, null, null], [48, 55, 60, 63]);
    expect(steps.slice(0, 3).map((s) => s.kind)).toEqual(['keep', 'keep', 'keep']);
    expect(steps[3]).toEqual({ kind: 'glide', from: 64, note: 63 });
    expect(steps.slice(4).map((s) => s.kind)).toEqual(['idle', 'idle']);
  });

  it('G → B (Creep): las notas que se mueven poco hacen glide', () => {
    // G2 | G3 B3 D4  →  B2 | F#3 B3 D#4
    const steps = planVoices([43, 55, 59, 62, null, null], [47, 54, 59, 63]);
    expect(steps[0]).toEqual({ kind: 'glide', from: 43, note: 47 });
    expect(steps[1]).toEqual({ kind: 'glide', from: 55, note: 54 });
    expect(steps[2]).toEqual({ kind: 'keep', note: 59 });
    expect(steps[3]).toEqual({ kind: 'glide', from: 62, note: 63 });
  });

  it('saltos grandes se resuelven con crossfade', () => {
    const steps = planVoices([60, null], [70]);
    expect(steps[0]).toEqual({ kind: 'release' });
    expect(steps[1]).toEqual({ kind: 'attack', note: 70 });
  });

  it('acorde más chico: las voces que sobran hacen release', () => {
    const steps = planVoices([43, 55, 59, 62, 65, null], [43, 55, 59, 62]);
    expect(steps[4]).toEqual({ kind: 'release' });
    expect(steps[5]).toEqual({ kind: 'idle' });
  });

  it('acorde más grande: la nota nueva usa una voz libre', () => {
    const steps = planVoices([43, 55, 59, 62, null], [43, 55, 59, 62, 65]);
    expect(steps[4]).toEqual({ kind: 'attack', note: 65 });
  });

  it('respeta la preferencia entre voces libres', () => {
    const steps = planVoices([null, null, null], [60], { idleRank: [2, 0, 1] });
    expect(steps[1]).toEqual({ kind: 'attack', note: 60 });
  });
});
