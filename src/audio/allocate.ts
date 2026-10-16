/**
 * Reparto de notas entre voces al cambiar de acorde (puro).
 *
 * - Las notas que siguen en el nuevo acorde se quedan en su voz, sin re-ataque.
 * - Las que cambian se deslizan desde la voz más cercana (glide) si el salto
 *   es pequeño; si es grande, se hace crossfade: la voz vieja hace release y
 *   una voz libre ataca la nota nueva.
 */

export type VoiceStep =
  | { readonly kind: 'keep'; readonly note: number }
  | { readonly kind: 'glide'; readonly from: number; readonly note: number }
  | { readonly kind: 'attack'; readonly note: number }
  | { readonly kind: 'release' }
  | { readonly kind: 'idle' };

export interface PlanOptions {
  /** Salto máximo en semitonos que se resuelve con glide; por encima, crossfade. */
  readonly maxGlide?: number;
  /**
   * Preferencia entre voces libres (menor = mejor), indexada por voz. Sirve para
   * usar primero las que llevan más tiempo en silencio.
   */
  readonly idleRank?: readonly number[];
}

const DROP_COST = 1000;

/**
 * @param current nota que suena en cada voz (null si está libre o en release).
 * @param target notas del nuevo acorde (incluido el bajo).
 * @returns un paso por voz.
 */
export function planVoices(
  current: readonly (number | null)[],
  target: readonly number[],
  opts: PlanOptions = {},
): VoiceStep[] {
  const maxGlide = opts.maxGlide ?? 4;
  const steps: (VoiceStep | undefined)[] = new Array(current.length).fill(undefined);
  const claimed = new Set<number>();
  const pending: number[] = [];

  // 1) Notas comunes: se quedan donde están.
  for (const note of new Set(target)) {
    const i = current.findIndex((c, k) => c === note && !claimed.has(k));
    if (i >= 0) {
      steps[i] = { kind: 'keep', note };
      claimed.add(i);
    } else {
      pending.push(note);
    }
  }

  // 2) Resto: búsqueda exhaustiva (hay pocas voces) del reparto más barato.
  const free = current.map((_, i) => i).filter((i) => !claimed.has(i));
  const idleCost = (i: number): number => maxGlide + 1 + 0.001 * (opts.idleRank?.[i] ?? i);
  let best: { cost: number; voices: number[] } = { cost: Infinity, voices: [] };
  const chosen: number[] = [];
  const taken = new Set<number>();

  const search = (k: number, cost: number): void => {
    if (cost >= best.cost) return;
    if (k === pending.length) {
      best = { cost, voices: [...chosen] };
      return;
    }
    const note = pending[k]!;
    for (const i of free) {
      if (taken.has(i)) continue;
      const c = current[i];
      let edge: number;
      if (c === null || c === undefined) {
        edge = idleCost(i);
      } else {
        const d = Math.abs(note - c);
        if (d > maxGlide) continue;
        edge = d;
      }
      taken.add(i);
      chosen.push(i);
      search(k + 1, cost + edge);
      chosen.pop();
      taken.delete(i);
    }
    // Sin voz disponible: la nota se descarta (solo pasa si el pool es muy chico).
    chosen.push(-1);
    search(k + 1, cost + DROP_COST);
    chosen.pop();
  };
  search(0, 0);

  best.voices.forEach((i, k) => {
    if (i < 0) return;
    const note = pending[k]!;
    const from = current[i];
    steps[i] = from === null || from === undefined ? { kind: 'attack', note } : { kind: 'glide', from, note };
  });

  return steps.map((s, i) => s ?? (current[i] === null || current[i] === undefined ? { kind: 'idle' } : { kind: 'release' }));
}
