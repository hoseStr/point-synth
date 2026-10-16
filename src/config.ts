import type { QualityId } from './music/theory';

/** Etiquetas de la rueda de raíces: orden cromático en sentido horario, C arriba. */
export const ROOT_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Calidades de la rueda derecha, en sentido horario desde arriba.
 * Para cambiar la rueda basta con editar este array; las calidades
 * disponibles están en QUALITY_DEFS (src/music/theory.ts).
 */
export const WHEEL_QUALITIES: readonly QualityId[] = ['maj', 'm', '7', 'maj7', 'm7', 'dim', 'aug', 'sus4'];

/** Geometría de las ruedas. Las fracciones son relativas al radio salvo que se indique. */
export const WHEEL = {
  /** Radio por defecto, como fracción del alto de la pantalla. */
  defaultSize: 0.26,
  minSize: 0.15,
  maxSize: 0.36,
  /** El radio nunca supera esta fracción del ancho (pantallas verticales). */
  maxWidthFraction: 0.23,
  /** Radio del círculo central (OFF / calidad actual). */
  innerRatio: 0.36,
  /** Se sigue seleccionando hasta 1.6 veces el radio: más cómodo de tocar. */
  reachRatio: 1.6,
  /** Distancia del centro de la pantalla al centro de cada rueda, como fracción del ancho. */
  defaultSpread: 0.24,
  minSpread: 0.12,
  maxSpread: 0.42,
  /** Con la separación máxima, como mucho esta fracción del radio queda fuera de pantalla. */
  maxEdgeCut: 0.15,
  /** Centro vertical de las ruedas, como fracción del alto. */
  centerY: 0.6,
  /** Radio al que se dibujan las etiquetas. */
  labelRatio: 0.72,
  /** El ángulo debe pasar 4° más allá del borde del segmento para cambiar. */
  hysteresisDeg: 4,
  /** Y la nueva selección debe mantenerse 60 ms. */
  holdMs: 60,
  /** Histéresis radial en los bordes del centro y del alcance. */
  radialHysteresis: 0.04,
} as const;

export const HANDS = {
  /** Si la mano izquierda desaparece más de esto, el acorde hace release. */
  lostReleaseMs: 150,
  /** Extensión del índice (punta → palma / tamaño de mano) para dedo recogido y estirado. */
  indexExtension: { curled: 0.6, extended: 1.0 },
  /** Apertura (distancia media puntas → palma / tamaño de mano) para puño y mano abierta. */
  openness: { fist: 0.55, open: 0.95 },
  /** Pinza pulgar–índice (distancia / tamaño de mano) para cerrada y abierta. */
  pinch: { closed: 0.2, open: 0.9 },
  /** Confianza mínima del handedness para fiarse de la etiqueta. */
  handednessMinScore: 0.75,
} as const;

/** Volumen cuando se toca con mouse o touch (no hay mano que lo controle). */
export const POINTER_VOLUME = 0.9;

export interface WheelColor {
  readonly id: string;
  readonly name: string;
  /** RGB del cuerpo de la rueda; la opacidad la pone el ajuste del usuario. */
  readonly rgb: readonly [number, number, number];
}

/**
 * Colores que se pueden elegir para cada rueda. Son oscuros a propósito: el
 * texto blanco tiene que leerse sobre cualquier video.
 */
export const WHEEL_COLORS = [
  { id: 'graphite', name: 'Grafito', rgb: [38, 38, 38] },
  { id: 'slate', name: 'Azul pizarra', rgb: [34, 50, 92] },
  { id: 'violet', name: 'Violeta', rgb: [74, 42, 112] },
  { id: 'emerald', name: 'Esmeralda', rgb: [18, 84, 66] },
  { id: 'wine', name: 'Vino', rgb: [112, 30, 54] },
  { id: 'amber', name: 'Ámbar', rgb: [122, 74, 18] },
] as const satisfies readonly WheelColor[];

export type WheelColorId = (typeof WHEEL_COLORS)[number]['id'];

export const WHEEL_COLOR_IDS: readonly WheelColorId[] = WHEEL_COLORS.map((c) => c.id);

export function wheelColorRgb(id: WheelColorId): readonly [number, number, number] {
  return (WHEEL_COLORS.find((c) => c.id === id) ?? WHEEL_COLORS[0]).rgb;
}

export const COLORS = {
  center: 'rgba(22, 22, 24, 0.92)',
  rim: 'rgba(235, 235, 235, 0.42)',
  separator: 'rgba(255, 255, 255, 0.10)',
  label: 'rgba(255, 255, 255, 0.95)',
  activeFill: 'rgba(255, 255, 255, 0.20)',
  activeStroke: 'rgba(255, 255, 255, 0.70)',
  scaleDot: 'rgba(255, 214, 120, 0.95)',
  cursorLeft: '#ffd66e',
  cursorRight: '#8fd3ff',
} as const;
