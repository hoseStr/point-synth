/**
 * Modo mouse / touch: cada puntero que empieza dentro de una rueda la controla
 * hasta que se suelta. Con multitouch se pueden tocar las dos ruedas a la vez.
 */
import { distanceFromCenter, type WheelLayout } from './wheel';

export type Side = 'left' | 'right';

export interface PointerTrack {
  readonly x: number;
  readonly y: number;
  /** false si el puntero ya se soltó (un toque que el bucle aún no había visto). */
  readonly held: boolean;
}

export class PointerInput {
  private readonly owners = new Map<number, Side>();
  private readonly tracks: Record<Side, PointerTrack | null> = { left: null, right: null };

  constructor(
    target: HTMLElement,
    private readonly getLayout: () => WheelLayout,
  ) {
    target.addEventListener('pointerdown', this.handleDown);
    target.addEventListener('pointermove', this.handleMove);
    target.addEventListener('pointerup', this.handleUp);
    target.addEventListener('pointercancel', this.handleUp);
    target.addEventListener('lostpointercapture', this.handleUp);
  }

  /**
   * Posición del puntero sobre esa rueda. Un toque que terminó entre dos frames
   * se entrega una sola vez, para que un clic rápido no se pierda.
   */
  read(side: Side): PointerTrack | null {
    const track = this.tracks[side];
    if (track && !track.held) this.tracks[side] = null;
    return track;
  }

  private readonly handleDown = (e: PointerEvent): void => {
    const layout = this.getLayout();
    for (const side of ['left', 'right'] as const) {
      const g = layout[side];
      if (this.tracks[side]?.held) continue;
      if (distanceFromCenter(g, e.clientX, e.clientY) > g.radius) continue;
      this.owners.set(e.pointerId, side);
      this.tracks[side] = { x: e.clientX, y: e.clientY, held: true };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
  };

  private readonly handleMove = (e: PointerEvent): void => {
    const side = this.owners.get(e.pointerId);
    if (side) this.tracks[side] = { x: e.clientX, y: e.clientY, held: true };
  };

  private readonly handleUp = (e: PointerEvent): void => {
    const side = this.owners.get(e.pointerId);
    if (!side) return;
    this.owners.delete(e.pointerId);
    const track = this.tracks[side];
    if (track) this.tracks[side] = { ...track, held: false };
  };
}
