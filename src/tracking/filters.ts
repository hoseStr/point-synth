/**
 * Filtro One Euro (Casiez, Roussel y Vogel, 2012): pasa-bajos cuyo corte sube
 * con la velocidad. Quieto, filtra mucho el temblor; en movimiento, casi no
 * agrega retraso. Puro: el tiempo llega como parámetro (en ms).
 */

export interface OneEuroParams {
  /** Corte mínimo en Hz (con la señal quieta). Más bajo = más suave. */
  readonly minCutoff: number;
  /** Cuánto sube el corte con la velocidad. Más alto = menos retraso en movimiento. */
  readonly beta: number;
  /** Corte del filtro de la derivada, en Hz. */
  readonly dCutoff: number;
}

function smoothingFactor(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  private value: number | null = null;
  private derivative = 0;
  private lastTime = 0;

  constructor(public params: OneEuroParams) {}

  filter(raw: number, timeMs: number): number {
    if (this.value === null) {
      this.value = raw;
      this.derivative = 0;
      this.lastTime = timeMs;
      return raw;
    }
    const dt = Math.max(1e-3, (timeMs - this.lastTime) / 1000);
    this.lastTime = timeMs;
    const rawDerivative = (raw - this.value) / dt;
    this.derivative += smoothingFactor(this.params.dCutoff, dt) * (rawDerivative - this.derivative);
    const cutoff = this.params.minCutoff + this.params.beta * Math.abs(this.derivative);
    this.value += smoothingFactor(cutoff, dt) * (raw - this.value);
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

export class OneEuroFilter2D {
  private readonly fx: OneEuroFilter;
  private readonly fy: OneEuroFilter;

  constructor(params: OneEuroParams) {
    this.fx = new OneEuroFilter(params);
    this.fy = new OneEuroFilter(params);
  }

  set params(p: OneEuroParams) {
    this.fx.params = p;
    this.fy.params = p;
  }

  filter(x: number, y: number, timeMs: number): { x: number; y: number } {
    return { x: this.fx.filter(x, timeMs), y: this.fy.filter(y, timeMs) };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Parámetros del cursor (en píxeles) según el ajuste de suavizado 0..1.
 * 0 = mínimo retraso, 1 = máximo suavizado.
 */
export function cursorFilterParams(smoothing: number): OneEuroParams {
  const s = Math.min(1, Math.max(0, smoothing));
  // Corte mínimo de 3 Hz a 0.3 Hz en escala logarítmica (≈ 0.95 Hz en el punto medio).
  return { minCutoff: 3 * Math.pow(0.1, s), beta: lerp(0.025, 0.005, s), dCutoff: 1 };
}

/** Parámetros del volumen (0..1) según el ajuste de suavizado. */
export function volumeFilterParams(smoothing: number): OneEuroParams {
  const s = Math.min(1, Math.max(0, smoothing));
  return { minCutoff: lerp(4, 0.8, s), beta: lerp(1.2, 0.3, s), dCutoff: 1 };
}
