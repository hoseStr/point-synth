/** Conversión de coordenadas de la cámara a píxeles de pantalla (puro). */

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Landmark normalizado (0..1 sobre el cuadro de la cámara, sin espejo) a píxel
 * de pantalla, con el video a pantalla completa con `object-fit: cover` (que
 * recorta los lados o arriba/abajo) y, opcionalmente, en espejo.
 */
export function videoToScreen(nx: number, ny: number, video: Size, view: Size, mirror: boolean): { x: number; y: number } {
  const scale = Math.max(view.width / video.width, view.height / video.height);
  const w = video.width * scale;
  const h = video.height * scale;
  const x = (view.width - w) / 2 + nx * w;
  const y = (view.height - h) / 2 + ny * h;
  return { x: mirror ? view.width - x : x, y };
}
