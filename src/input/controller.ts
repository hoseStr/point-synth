/**
 * Traduce lo que hacen las manos (o el puntero) en el estado musical deseado:
 * raíz (o silencio), calidad y volumen. Puro: recibe el tiempo como parámetro.
 */
import type { WheelSelection } from './wheel';

export interface LeftInput {
  readonly selection: WheelSelection;
  /** 0 (puño / silencio) … 1 (mano abierta). */
  readonly volume: number;
}

export interface RightInput {
  readonly selection: WheelSelection;
}

export interface ControlState {
  /** Índice de la raíz (0 = C) o null si no debe sonar nada. */
  readonly root: number | null;
  /** Índice en la rueda de calidades. */
  readonly quality: number;
  readonly volume: number;
}

export class ChordController {
  private root: number | null = null;
  private quality: number;
  private volume = 0;
  private lastLeftSeen = -Infinity;
  /** Raíz que sonaba al pulsar pánico; undefined si no hay pánico activo. */
  private panicRoot: number | null | undefined = undefined;

  constructor(
    private readonly lostReleaseMs: number,
    initialQuality = 0,
  ) {
    this.quality = initialQuality;
  }

  /**
   * @param left mano izquierda o puntero sobre la rueda izquierda; null si no hay.
   * @param right mano derecha o puntero sobre la rueda derecha; null si no hay.
   */
  update(now: number, left: LeftInput | null, right: RightInput | null): ControlState {
    if (left) {
      this.lastLeftSeen = now;
      const s = left.selection;
      if (s.kind === 'segment') this.root = s.index;
      else if (s.kind === 'center') this.root = null;
      // 'outside' y 'none' mantienen la raíz: pasar entre segmentos no corta el sonido.
      this.volume = left.volume;
    } else if (now - this.lastLeftSeen > this.lostReleaseMs) {
      this.root = null;
    }

    // Sin mano derecha (o en su centro) se mantiene la última calidad.
    if (right && right.selection.kind === 'segment') this.quality = right.selection.index;

    // Tras un pánico, el acorde no vuelve a sonar hasta que cambie la raíz.
    if (this.panicRoot !== undefined && this.root !== this.panicRoot) this.panicRoot = undefined;

    return {
      root: this.panicRoot !== undefined ? null : this.root,
      quality: this.quality,
      volume: this.volume,
    };
  }

  /** Soltar el puntero de la rueda izquierda: silencio inmediato, sin esperar los 150 ms. */
  releaseLeft(): void {
    this.root = null;
    this.lastLeftSeen = -Infinity;
  }

  panic(): void {
    if (this.root !== null) this.panicRoot = this.root;
  }

  get currentQuality(): number {
    return this.quality;
  }
}
