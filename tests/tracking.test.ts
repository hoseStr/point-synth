import { describe, expect, it } from 'vitest';
import { assignHands, type HandCandidate } from '../src/input/assign';
import { videoToScreen } from '../src/input/coords';
import { controlPoint, indexExtension, normalize, opennessRatio, palmCenter, pinchRatio, type Point3 } from '../src/input/gestures';
import { OneEuroFilter, cursorFilterParams } from '../src/tracking/filters';

// ---------------------------------------------------------------------------
// Mano sintética en metros (como los worldLandmarks de MediaPipe)
// ---------------------------------------------------------------------------

function makeHand(tips: Record<number, [number, number, number]>): Point3[] {
  const lm: Point3[] = Array.from({ length: 21 }, () => ({ x: 0, y: -0.04, z: 0 }));
  const set = (i: number, x: number, y: number, z = 0): void => {
    lm[i] = { x, y, z };
  };
  set(0, 0, 0);
  set(5, -0.03, -0.08);
  set(9, -0.01, -0.085);
  set(13, 0.01, -0.08);
  set(17, 0.03, -0.075);
  for (const [i, [x, y, z]] of Object.entries(tips)) set(Number(i), x, y, z);
  return lm;
}

const OPEN = makeHand({
  4: [-0.08, -0.07, 0],
  8: [-0.035, -0.17, 0],
  12: [-0.01, -0.18, 0],
  16: [0.015, -0.17, 0],
  20: [0.04, -0.15, 0],
});

const FIST = makeHand({
  4: [-0.02, -0.06, 0.03],
  8: [-0.025, -0.05, 0.03],
  12: [-0.008, -0.05, 0.035],
  16: [0.01, -0.05, 0.03],
  20: [0.025, -0.05, 0.025],
});

/** Apuntando: índice estirado, el resto de los dedos recogidos. */
const POINTING = makeHand({
  4: [-0.02, -0.06, 0.03],
  8: [-0.035, -0.17, 0],
  12: [-0.008, -0.05, 0.035],
  16: [0.01, -0.05, 0.03],
  20: [0.025, -0.05, 0.025],
});

const PINCHED = makeHand({
  4: [-0.03, -0.12, 0],
  8: [-0.032, -0.128, 0],
  12: [-0.01, -0.18, 0],
  16: [0.015, -0.17, 0],
  20: [0.04, -0.15, 0],
});

describe('gestos', () => {
  it('centro de la palma = promedio de muñeca y nudillos', () => {
    const c = palmCenter(OPEN);
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(-0.064);
  });

  it('mano abierta → volumen máximo, puño → silencio', () => {
    const open = opennessRatio(OPEN);
    const fist = opennessRatio(FIST);
    expect(open).toBeGreaterThan(1);
    expect(fist).toBeLessThan(0.5);
    expect(normalize(open, 0.55, 0.95)).toBe(1);
    expect(normalize(fist, 0.55, 0.95)).toBe(0);
  });

  it('la apertura no depende del tamaño de la mano', () => {
    const scaled = OPEN.map((p) => ({ x: p.x * 1.4, y: p.y * 1.4, z: p.z * 1.4 }));
    expect(opennessRatio(scaled)).toBeCloseTo(opennessRatio(OPEN));
  });

  it('apuntar con el índice → volumen máximo; recogerlo → silencio', () => {
    expect(normalize(indexExtension(POINTING), 0.6, 1.0)).toBe(1);
    expect(normalize(indexExtension(OPEN), 0.6, 1.0)).toBe(1);
    expect(normalize(indexExtension(FIST), 0.6, 1.0)).toBe(0);
  });

  it('al apuntar, la apertura de la mano sería casi silencio (por eso el modo dedo)', () => {
    expect(normalize(opennessRatio(POINTING), 0.55, 0.95)).toBeLessThan(0.2);
  });

  it('pinza pulgar–índice', () => {
    expect(pinchRatio(OPEN)).toBeGreaterThan(1);
    expect(pinchRatio(PINCHED)).toBeLessThan(0.2);
  });

  it('punto de control', () => {
    expect(controlPoint(OPEN, 'index')).toEqual(OPEN[8]);
    expect(controlPoint(OPEN, 'palm')).toEqual(palmCenter(OPEN));
  });
});

describe('coordenadas', () => {
  const video = { width: 1280, height: 720 };

  it('mismo aspecto: escala directa', () => {
    const p = videoToScreen(0.25, 0.5, video, { width: 640, height: 360 }, false);
    expect(p.x).toBeCloseTo(160);
    expect(p.y).toBeCloseTo(180);
  });

  it('object-fit: cover recorta los lados en pantallas más altas', () => {
    // 1000×1000: el video se escala a 1777.8×1000 y se recortan 388.9 px por lado.
    const p = videoToScreen(0.25, 0.5, video, { width: 1000, height: 1000 }, false);
    expect(p.x).toBeCloseTo(-388.89 + 0.25 * 1777.78, 1);
    expect(p.y).toBeCloseTo(500);
  });

  it('el espejo refleja respecto al centro de la pantalla', () => {
    const view = { width: 1000, height: 1000 };
    const a = videoToScreen(0.3, 0.4, video, view, false);
    const b = videoToScreen(0.3, 0.4, video, view, true);
    expect(b.x).toBeCloseTo(1000 - a.x);
    expect(b.y).toBeCloseTo(a.y);
  });
});

describe('asignación de manos', () => {
  const W = 1000;
  const hand = (handedness: 'Left' | 'Right', screenX: number, score = 0.95): HandCandidate => ({ handedness, score, screenX });

  it('con espejo, la etiqueta "Right" (mano izquierda real) va a la rueda izquierda', () => {
    const hands = [hand('Left', 800), hand('Right', 200)];
    expect(assignHands(hands, 'handedness', true, W, 0.75)).toEqual({ left: 1, right: 0 });
    expect(assignHands(hands, 'auto', true, W, 0.75)).toEqual({ left: 1, right: 0 });
  });

  it('sin espejo se invierte la etiqueta', () => {
    const hands = [hand('Left', 200), hand('Right', 800)];
    expect(assignHands(hands, 'handedness', false, W, 0.75)).toEqual({ left: 0, right: 1 });
  });

  it('por posición: la mano más a la izquierda en pantalla va a la rueda izquierda', () => {
    const hands = [hand('Right', 700), hand('Right', 300)];
    expect(assignHands(hands, 'position', true, W, 0.75)).toEqual({ left: 1, right: 0 });
    expect(assignHands([hand('Left', 300)], 'position', true, W, 0.75)).toEqual({ left: 0, right: null });
    expect(assignHands([hand('Left', 700)], 'position', true, W, 0.75)).toEqual({ left: null, right: 0 });
  });

  it('auto: etiquetas repetidas → posición', () => {
    const hands = [hand('Right', 700), hand('Right', 300)];
    expect(assignHands(hands, 'auto', true, W, 0.75)).toEqual({ left: 1, right: 0 });
  });

  it('auto: etiquetas que contradicen claramente la posición → posición', () => {
    const hands = [hand('Right', 900), hand('Left', 100)];
    expect(assignHands(hands, 'auto', true, W, 0.75)).toEqual({ left: 1, right: 0 });
  });

  it('auto: una mano con poca confianza → posición', () => {
    expect(assignHands([hand('Right', 800, 0.5)], 'auto', true, W, 0.75)).toEqual({ left: null, right: 0 });
    expect(assignHands([hand('Right', 800, 0.9)], 'auto', true, W, 0.75)).toEqual({ left: 0, right: null });
  });

  it('sin manos', () => {
    expect(assignHands([], 'auto', true, W, 0.75)).toEqual({ left: null, right: null });
  });
});

describe('filtro One Euro', () => {
  it('una señal constante sale igual', () => {
    const f = new OneEuroFilter(cursorFilterParams(0.5));
    for (let t = 0; t < 1000; t += 33) expect(f.filter(100, t)).toBeCloseTo(100);
  });

  it('reduce el temblor con la mano quieta', () => {
    const f = new OneEuroFilter(cursorFilterParams(0.5));
    let seed = 1;
    const noise = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647 - 0.5) * 8;
    };
    const raw: number[] = [];
    const out: number[] = [];
    for (let k = 0; k < 120; k++) {
      const x = 300 + noise();
      raw.push(x);
      out.push(f.filter(x, k * 33));
    }
    const spread = (xs: number[]): number => Math.max(...xs.slice(30)) - Math.min(...xs.slice(30));
    expect(spread(out)).toBeLessThan(spread(raw) / 2);
  });

  it('sigue un movimiento rápido con poco retraso', () => {
    const f = new OneEuroFilter(cursorFilterParams(0.5));
    let last = 0;
    // 1500 px/s durante medio segundo, a 30 fps.
    for (let k = 0; k <= 15; k++) last = f.filter(k * 50, k * 33.3);
    expect(750 - last).toBeLessThan(60);
  });

  it('reset olvida el estado', () => {
    const f = new OneEuroFilter(cursorFilterParams(0.5));
    f.filter(0, 0);
    f.filter(10, 33);
    f.reset();
    expect(f.filter(500, 66)).toBe(500);
  });
});
