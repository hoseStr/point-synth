import { describe, expect, it } from 'vitest';
import {
  SelectionStabilizer,
  angleFromCenter,
  angularDistance,
  layoutWheels,
  rawSelection,
  segmentAtAngle,
  type WheelGeometry,
} from '../src/input/wheel';

const g: WheelGeometry = { cx: 0, cy: 0, radius: 100, innerRadius: 36, reach: 160 };

/** Punto a `dist` del centro con ángulo `deg` (0 = arriba, horario). */
function at(deg: number, dist = 70): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [Math.sin(rad) * dist, -Math.cos(rad) * dist];
}

describe('ángulos', () => {
  it('0° arriba y sentido horario', () => {
    expect(angleFromCenter(g, 0, -10)).toBeCloseTo(0);
    expect(angleFromCenter(g, 10, 0)).toBeCloseTo(90);
    expect(angleFromCenter(g, 0, 10)).toBeCloseTo(180);
    expect(angleFromCenter(g, -10, 0)).toBeCloseTo(270);
  });

  it('distancia angular con signo y envolvente', () => {
    expect(angularDistance(10, 350)).toBe(20);
    expect(angularDistance(350, 10)).toBe(-20);
    expect(angularDistance(180, 0)).toBe(180);
  });
});

describe('segmentos', () => {
  it('12 raíces: C centrada arriba, cromático en sentido horario', () => {
    expect(segmentAtAngle(0, 12)).toBe(0);
    expect(segmentAtAngle(14.9, 12)).toBe(0);
    expect(segmentAtAngle(345.1, 12)).toBe(0);
    expect(segmentAtAngle(15.1, 12)).toBe(1); // C#
    expect(segmentAtAngle(210, 12)).toBe(7); // G
    expect(segmentAtAngle(330, 12)).toBe(11); // B
  });

  it('8 calidades', () => {
    expect(segmentAtAngle(0, 8)).toBe(0);
    expect(segmentAtAngle(45, 8)).toBe(1);
    expect(segmentAtAngle(337.6, 8)).toBe(0);
  });
});

describe('zonas', () => {
  it('centro, anillo y fuera', () => {
    expect(rawSelection(g, ...at(0, 20), 12)).toEqual({ kind: 'center' });
    expect(rawSelection(g, ...at(210, 70), 12)).toEqual({ kind: 'segment', index: 7 });
    // Fuera del círculo pero dentro de 1.6 × radio: sigue seleccionando.
    expect(rawSelection(g, ...at(210, 150), 12)).toEqual({ kind: 'segment', index: 7 });
    expect(rawSelection(g, ...at(210, 170), 12)).toEqual({ kind: 'outside' });
  });
});

describe('histéresis', () => {
  const opts = { hysteresisDeg: 4, holdMs: 60, radialHysteresis: 0.04 };

  it('la primera lectura se acepta enseguida', () => {
    const s = new SelectionStabilizer(12, opts);
    expect(s.update(g, ...at(0), 0)).toEqual({ kind: 'segment', index: 0 });
  });

  it('no cambia si el ángulo pasa el borde menos de 4°', () => {
    const s = new SelectionStabilizer(12, opts);
    s.update(g, ...at(0), 0);
    // El borde entre C y C# está en 15°.
    for (let t = 10; t <= 200; t += 10) s.update(g, ...at(18), t);
    expect(s.stable).toEqual({ kind: 'segment', index: 0 });
    expect(s.raw).toEqual({ kind: 'segment', index: 1 });
  });

  it('cambia pasando 4° el borde, pero solo tras 60 ms estable', () => {
    const s = new SelectionStabilizer(12, opts);
    s.update(g, ...at(0), 0);
    s.update(g, ...at(20), 100);
    expect(s.stable).toEqual({ kind: 'segment', index: 0 });
    s.update(g, ...at(20), 150);
    expect(s.stable).toEqual({ kind: 'segment', index: 0 });
    s.update(g, ...at(20), 160);
    expect(s.stable).toEqual({ kind: 'segment', index: 1 });
  });

  it('un parpadeo reinicia la espera', () => {
    const s = new SelectionStabilizer(12, opts);
    s.update(g, ...at(0), 0);
    s.update(g, ...at(20), 100);
    s.update(g, ...at(5), 140); // vuelve a C antes de los 60 ms
    s.update(g, ...at(20), 150);
    s.update(g, ...at(20), 200);
    expect(s.stable).toEqual({ kind: 'segment', index: 0 });
    s.update(g, ...at(20), 210);
    expect(s.stable).toEqual({ kind: 'segment', index: 1 });
  });

  it('histéresis radial en el borde del centro', () => {
    const s = new SelectionStabilizer(12, opts);
    s.update(g, ...at(0, 30), 0);
    expect(s.stable).toEqual({ kind: 'center' });
    // 38 px: ya fuera del centro (36) pero dentro del margen (36 + 4).
    s.update(g, ...at(0, 38), 10);
    s.update(g, ...at(0, 38), 100);
    expect(s.stable).toEqual({ kind: 'center' });
    s.update(g, ...at(0, 45), 110);
    s.update(g, ...at(0, 45), 200);
    expect(s.stable).toEqual({ kind: 'segment', index: 0 });
  });
});

describe('layout', () => {
  const params = {
    size: 0.26,
    maxWidthFraction: 0.23,
    innerRatio: 0.36,
    reachRatio: 1.6,
    spread: 0.24,
    maxEdgeCut: 0.15,
    centerY: 0.6,
  };

  it('ruedas simétricas respecto al centro, completas en pantalla', () => {
    const { left, right } = layoutWheels(1600, 900, params);
    expect(left.radius).toBeCloseTo(234);
    expect(left.cx).toBeCloseTo(800 - 0.24 * 1600);
    expect(right.cx).toBeCloseTo(800 + 0.24 * 1600);
    expect(left.cx - left.radius).toBeGreaterThan(0);
    expect(right.cx + right.radius).toBeLessThan(1600);
    expect(left.cy).toBe(540);
    expect(left.reach).toBeCloseTo(234 * 1.6);
  });

  it('con poca separación las ruedas no se tocan', () => {
    const { left, right } = layoutWheels(1600, 900, { ...params, spread: 0.05 });
    expect(right.cx - right.radius - (left.cx + left.radius)).toBeCloseTo(16);
  });

  it('con mucha separación solo se cortan un poco por el borde', () => {
    const { left } = layoutWheels(1600, 900, { ...params, spread: 0.5 });
    expect(left.cx).toBeCloseTo(234 * 0.85);
  });

  it('en pantallas verticales el radio lo limita el ancho y no se solapan', () => {
    const { left, right } = layoutWheels(390, 844, params);
    expect(left.radius).toBeCloseTo(390 * 0.23);
    expect(right.cx - left.cx).toBeGreaterThanOrEqual(2 * left.radius + 16 - 1e-9);
  });
});
