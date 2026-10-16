/**
 * Medidas de la mano a partir de los 21 landmarks de MediaPipe (puro).
 *
 * Índices: 0 muñeca · 1–4 pulgar · 5–8 índice · 9–12 medio · 13–16 anular · 17–20 meñique.
 * Las medidas de volumen usan los landmarks "world" (en metros, centrados en la
 * mano): así no dependen de la distancia a la cámara.
 */

export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const WRIST = 0;
export const THUMB_TIP = 4;
export const INDEX_TIP = 8;
export const MIDDLE_MCP = 9;
export const FINGERTIPS = [4, 8, 12, 16, 20] as const;
/** Muñeca y nudillos: su promedio es el centro de la palma. */
export const PALM_POINTS = [0, 5, 9, 13, 17] as const;

export function distance(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function mean(points: readonly Point3[]): Point3 {
  let x = 0, y = 0, z = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
    z += p.z;
  }
  const n = points.length || 1;
  return { x: x / n, y: y / n, z: z / n };
}

function pick(lm: readonly Point3[], indices: readonly number[]): Point3[] {
  return indices.map((i) => lm[i]!);
}

export function palmCenter(lm: readonly Point3[]): Point3 {
  return mean(pick(lm, PALM_POINTS));
}

/** Tamaño de referencia de la mano: muñeca → nudillo del dedo medio. */
export function handSize(lm: readonly Point3[]): number {
  return distance(lm[WRIST]!, lm[MIDDLE_MCP]!) || 1e-6;
}

/** Distancia media de las puntas de los dedos al centro de la palma, normalizada por el tamaño de la mano. */
export function opennessRatio(lm: readonly Point3[]): number {
  const center = palmCenter(lm);
  const tips = pick(lm, FINGERTIPS);
  const avg = tips.reduce((s, p) => s + distance(p, center), 0) / tips.length;
  return avg / handSize(lm);
}

/** Distancia pulgar–índice normalizada por el tamaño de la mano. */
export function pinchRatio(lm: readonly Point3[]): number {
  return distance(lm[THUMB_TIP]!, lm[INDEX_TIP]!) / handSize(lm);
}

/** Lleva `value` del rango [lo, hi] a 0..1, saturando en los extremos. */
export function normalize(value: number, lo: number, hi: number): number {
  return Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
}

/**
 * Cuánto está estirado el índice: distancia de su punta al centro de la palma,
 * normalizada por el tamaño de la mano. Estirado ≈ 1.3, recogido ≈ 0.5,
 * independientemente de lo que hagan los otros dedos.
 */
export function indexExtension(lm: readonly Point3[]): number {
  return distance(lm[INDEX_TIP]!, palmCenter(lm)) / handSize(lm);
}

/** Punto que mueve el cursor: centro de la palma o punta del índice. */
export function controlPoint(lm: readonly Point3[], mode: 'palm' | 'index'): Point3 {
  return mode === 'index' ? lm[INDEX_TIP]! : palmCenter(lm);
}
