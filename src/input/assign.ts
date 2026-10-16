/**
 * Qué mano controla cada rueda (puro).
 *
 * MediaPipe etiqueta la mano suponiendo que la imagen viene en espejo (selfie).
 * Nosotros le pasamos el cuadro crudo de la cámara, así que la etiqueta sale
 * invertida: la mano izquierda real del usuario llega como "Right". Con el
 * video en espejo, esa mano se ve a la izquierda y controla la rueda izquierda;
 * sin espejo, la mano que se ve a la izquierda es la derecha real ("Left").
 */

export type Handedness = 'Left' | 'Right';
export type AssignmentMode = 'auto' | 'handedness' | 'position';

export interface HandCandidate {
  readonly handedness: Handedness;
  readonly score: number;
  /** Posición horizontal del punto de control en pantalla, en píxeles. */
  readonly screenX: number;
}

export interface Assignment {
  /** Índice de la mano de la rueda izquierda, o null. */
  readonly left: number | null;
  readonly right: number | null;
}

/** Etiqueta de MediaPipe que corresponde a la rueda izquierda. */
export function leftWheelLabel(mirror: boolean): Handedness {
  return mirror ? 'Right' : 'Left';
}

function byPosition(hands: readonly HandCandidate[], viewWidth: number): Assignment {
  if (hands.length === 0) return { left: null, right: null };
  if (hands.length === 1) return hands[0]!.screenX < viewWidth / 2 ? { left: 0, right: null } : { left: null, right: 0 };
  const [a, b] = hands[0]!.screenX <= hands[1]!.screenX ? [0, 1] : [1, 0];
  return { left: a, right: b };
}

function byLabel(hands: readonly HandCandidate[], mirror: boolean): Assignment {
  const leftLabel = leftWheelLabel(mirror);
  let left: number | null = null;
  let right: number | null = null;
  hands.forEach((h, i) => {
    if (h.handedness === leftLabel) {
      if (left === null || h.score > hands[left]!.score) left = i;
    } else if (right === null || h.score > hands[right]!.score) {
      right = i;
    }
  });
  return { left, right };
}

/**
 * @param minScore confianza mínima del handedness para fiarse de la etiqueta en modo auto.
 */
export function assignHands(
  hands: readonly HandCandidate[],
  mode: AssignmentMode,
  mirror: boolean,
  viewWidth: number,
  minScore: number,
): Assignment {
  if (mode === 'position') return byPosition(hands, viewWidth);
  if (mode === 'handedness') return byLabel(hands, mirror);

  // auto: etiqueta si es confiable y coherente; si no, posición.
  if (hands.length === 1) {
    return hands[0]!.score >= minScore ? byLabel(hands, mirror) : byPosition(hands, viewWidth);
  }
  if (hands.length >= 2) {
    const [a, b] = hands as [HandCandidate, HandCandidate];
    const confident = a.handedness !== b.handedness && a.score >= minScore && b.score >= minScore;
    if (!confident) return byPosition(hands, viewWidth);
    const labeled = byLabel(hands, mirror);
    // Si la etiqueta pone la mano "izquierda" claramente a la derecha de la otra,
    // lo más probable es un error de clasificación: manda la posición.
    const lx = hands[labeled.left!]!.screenX;
    const rx = hands[labeled.right!]!.screenX;
    return lx > rx + viewWidth * 0.15 ? byPosition(hands, viewWidth) : labeled;
  }
  return { left: null, right: null };
}
