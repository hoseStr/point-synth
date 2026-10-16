/**
 * Geometría de las ruedas y selección de segmento por ángulo, con histéresis.
 * Puro: trabaja en píxeles de pantalla y recibe el tiempo como parámetro.
 */

export interface WheelGeometry {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  /** Radio del círculo central. */
  readonly innerRadius: number;
  /** Distancia máxima a la que aún se selecciona un segmento. */
  readonly reach: number;
}

export type WheelSelection =
  | { readonly kind: 'none' }
  | { readonly kind: 'center' }
  | { readonly kind: 'outside' }
  | { readonly kind: 'segment'; readonly index: number };

export const NONE: WheelSelection = { kind: 'none' };

export function sameSelection(a: WheelSelection, b: WheelSelection): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind !== 'segment' || a.index === (b as { index: number }).index;
}

/** Ángulo en grados respecto al centro: 0 = arriba, crece en sentido horario, en [0, 360). */
export function angleFromCenter(g: WheelGeometry, x: number, y: number): number {
  const deg = (Math.atan2(x - g.cx, -(y - g.cy)) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function distanceFromCenter(g: WheelGeometry, x: number, y: number): number {
  return Math.hypot(x - g.cx, y - g.cy);
}

/** Segmento que contiene el ángulo. El segmento 0 está centrado arriba. */
export function segmentAtAngle(angle: number, count: number): number {
  const size = 360 / count;
  return Math.floor((((angle + size / 2) % 360) + 360) % 360 / size) % count;
}

export function segmentCenterAngle(index: number, count: number): number {
  return (index * 360) / count;
}

/** Diferencia angular con signo más corta, en (-180, 180]. */
export function angularDistance(a: number, b: number): number {
  const d = (((a - b) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/** Selección sin histéresis: lo que hay bajo el cursor ahora mismo. */
export function rawSelection(g: WheelGeometry, x: number, y: number, count: number): WheelSelection {
  const dist = distanceFromCenter(g, x, y);
  if (dist < g.innerRadius) return { kind: 'center' };
  if (dist > g.reach) return { kind: 'outside' };
  return { kind: 'segment', index: segmentAtAngle(angleFromCenter(g, x, y), count) };
}

export interface StabilizerOptions {
  /** Grados que el ángulo debe pasar más allá del borde para cambiar de segmento. */
  readonly hysteresisDeg: number;
  /** Milisegundos que la nueva selección debe mantenerse antes de aceptarla. */
  readonly holdMs: number;
  /** Histéresis radial como fracción del radio. */
  readonly radialHysteresis: number;
}

/**
 * Estabiliza la selección de una rueda frente al temblor del tracking:
 * histéresis angular y radial, y un tiempo mínimo de permanencia.
 */
export class SelectionStabilizer {
  /** Selección aceptada. */
  stable: WheelSelection = NONE;
  /** Lo que hay bajo el cursor sin filtrar (para el modo debug). */
  raw: WheelSelection = NONE;
  /** Último ángulo medido (para el modo debug). */
  angle = 0;
  private pending: WheelSelection | null = null;
  private pendingSince = 0;

  constructor(
    private count: number,
    private readonly opts: StabilizerOptions,
  ) {}

  /** Cambia la cantidad de segmentos (la rueda cambió de contenido) y empieza de cero. */
  setSegmentCount(count: number): void {
    if (count === this.count) return;
    this.count = count;
    this.reset();
  }

  reset(): void {
    this.stable = NONE;
    this.raw = NONE;
    this.pending = null;
  }

  update(g: WheelGeometry, x: number, y: number, now: number): WheelSelection {
    const dist = distanceFromCenter(g, x, y);
    const angle = angleFromCenter(g, x, y);
    this.angle = angle;
    this.raw = rawSelection(g, x, y, this.count);

    const candidate = this.candidate(g, dist, angle);
    if (this.stable.kind === 'none') {
      // La primera lectura no es un cambio de segmento: se acepta enseguida.
      this.stable = candidate;
      this.pending = null;
    } else if (sameSelection(candidate, this.stable)) {
      this.pending = null;
    } else {
      if (this.pending === null || !sameSelection(this.pending, candidate)) {
        this.pending = candidate;
        this.pendingSince = now;
      }
      if (now - this.pendingSince >= this.opts.holdMs) {
        this.stable = candidate;
        this.pending = null;
      }
    }
    return this.stable;
  }

  /** Lo que se seleccionaría aplicando la histéresis respecto a la selección actual. */
  private candidate(g: WheelGeometry, dist: number, angle: number): WheelSelection {
    const margin = g.radius * this.opts.radialHysteresis;
    const s = this.stable;
    const centerLimit = s.kind === 'center' ? g.innerRadius + margin : s.kind === 'none' ? g.innerRadius : g.innerRadius - margin;
    const reachLimit = s.kind === 'outside' ? g.reach - margin : s.kind === 'none' ? g.reach : g.reach + margin;
    if (dist < centerLimit) return { kind: 'center' };
    if (dist > reachLimit) return { kind: 'outside' };

    const index = segmentAtAngle(angle, this.count);
    if (s.kind === 'segment' && index !== s.index) {
      const half = 180 / this.count;
      const fromCurrent = Math.abs(angularDistance(angle, segmentCenterAngle(s.index, this.count)));
      if (fromCurrent <= half + this.opts.hysteresisDeg) return s;
    }
    return { kind: 'segment', index };
  }
}

export interface WheelLayoutParams {
  /** Radio como fracción del alto. */
  readonly size: number;
  readonly maxWidthFraction: number;
  readonly innerRatio: number;
  readonly reachRatio: number;
  /** Distancia del centro de la pantalla al centro de cada rueda, como fracción del ancho. */
  readonly spread: number;
  /** Fracción máxima del radio que puede quedar fuera de pantalla. */
  readonly maxEdgeCut: number;
  readonly centerY: number;
}

export interface WheelLayout {
  readonly left: WheelGeometry;
  readonly right: WheelGeometry;
}

/** Margen mínimo entre las dos ruedas, en píxeles. */
const WHEEL_GAP = 16;

/**
 * Coloca las dos ruedas simétricas respecto al centro de la pantalla, a la
 * separación pedida, sin que se toquen entre sí ni se salgan de más por los bordes.
 */
export function layoutWheels(viewW: number, viewH: number, p: WheelLayoutParams): WheelLayout {
  const radius = Math.max(40, Math.min(viewH * p.size, viewW * p.maxWidthFraction));
  const cy = viewH * p.centerY;
  const minOffset = radius + WHEEL_GAP / 2;
  const maxOffset = Math.max(minOffset, viewW / 2 - radius * (1 - p.maxEdgeCut));
  const offset = Math.min(maxOffset, Math.max(minOffset, viewW * p.spread));
  const make = (cx: number): WheelGeometry => ({
    cx,
    cy,
    radius,
    innerRadius: radius * p.innerRatio,
    reach: radius * p.reachRatio,
  });
  return { left: make(viewW / 2 - offset), right: make(viewW / 2 + offset) };
}
