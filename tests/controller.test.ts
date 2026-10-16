import { describe, expect, it } from 'vitest';
import { ChordController } from '../src/input/controller';
import type { WheelSelection } from '../src/input/wheel';

const seg = (index: number): WheelSelection => ({ kind: 'segment', index });
const CENTER: WheelSelection = { kind: 'center' };
const OUTSIDE: WheelSelection = { kind: 'outside' };

describe('ChordController', () => {
  it('raíz y calidad desde las dos ruedas', () => {
    const c = new ChordController(150);
    const out = c.update(0, { selection: seg(7), volume: 1 }, { selection: seg(1) });
    expect(out).toEqual({ root: 7, quality: 1, volume: 1 });
  });

  it('el centro de la rueda izquierda silencia', () => {
    const c = new ChordController(150);
    c.update(0, { selection: seg(7), volume: 1 }, null);
    expect(c.update(10, { selection: CENTER, volume: 1 }, null).root).toBeNull();
  });

  it('fuera de la rueda se mantiene la raíz', () => {
    const c = new ChordController(150);
    c.update(0, { selection: seg(7), volume: 1 }, null);
    expect(c.update(10, { selection: OUTSIDE, volume: 1 }, null).root).toBe(7);
  });

  it('si la mano izquierda desaparece, release solo después de 150 ms', () => {
    const c = new ChordController(150);
    c.update(0, { selection: seg(7), volume: 1 }, null);
    expect(c.update(100, null, null).root).toBe(7);
    expect(c.update(150, null, null).root).toBe(7);
    expect(c.update(151, null, null).root).toBeNull();
  });

  it('sin mano derecha o en su centro se mantiene la última calidad', () => {
    const c = new ChordController(150);
    c.update(0, { selection: seg(0), volume: 1 }, { selection: seg(4) });
    expect(c.update(10, { selection: seg(0), volume: 1 }, null).quality).toBe(4);
    expect(c.update(20, { selection: seg(0), volume: 1 }, { selection: CENTER }).quality).toBe(4);
  });

  it('tras el pánico no vuelve a sonar hasta que cambie la raíz', () => {
    const c = new ChordController(150);
    c.update(0, { selection: seg(7), volume: 1 }, null);
    c.panic();
    expect(c.update(10, { selection: seg(7), volume: 1 }, null).root).toBeNull();
    expect(c.update(20, { selection: seg(11), volume: 1 }, null).root).toBe(11);
  });

  it('tras el pánico, pasar por OFF y volver a la misma raíz la hace sonar', () => {
    const c = new ChordController(150);
    c.update(0, { selection: seg(7), volume: 1 }, null);
    c.panic();
    c.update(10, { selection: CENTER, volume: 1 }, null);
    expect(c.update(20, { selection: seg(7), volume: 1 }, null).root).toBe(7);
  });
});
