/** Dibujo en canvas de las ruedas, los cursores y la capa de debug. */
import { COLORS, WHEEL } from '../config';
import type { WheelGeometry } from '../input/wheel';

export interface WheelView {
  readonly geometry: WheelGeometry;
  readonly labels: readonly string[];
  /** Segunda línea opcional bajo cada etiqueta (p. ej. la nota bajo el número romano). */
  readonly sublabels?: readonly string[];
  /** Color RGB del cuerpo de la rueda. */
  readonly tint: readonly [number, number, number];
  readonly opacity: number;
  /** Segmento resaltado, o null. */
  readonly active: number | null;
  /** El cursor está en el círculo central. */
  readonly centerActive: boolean;
  readonly centerText: string;
  /** Segmentos marcados con un punto (notas de la escala). */
  readonly dots?: readonly boolean[];
}

export interface CursorView {
  readonly x: number;
  readonly y: number;
  readonly wheel: WheelGeometry;
  readonly color: string;
}

export interface DebugHandView {
  /** Los 21 landmarks ya en píxeles de pantalla. */
  readonly points: readonly { readonly x: number; readonly y: number }[];
  readonly color: string;
  readonly lines: readonly string[];
}

const HAND_CONNECTIONS: readonly [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const TAU = Math.PI * 2;

/**
 * Tamaño de letra (≤ `size`) con el que el texto más ancho de `texts` cabe en
 * `room` píxeles. Mide en negrita, el caso más ancho.
 */
function fitFontSize(c: CanvasRenderingContext2D, texts: readonly string[], size: number, room: number, weight = 600): number {
  c.font = `${weight} ${size}px ${FONT}`;
  const widest = Math.max(1, ...texts.map((t) => c.measureText(t).width));
  return Math.max(9, Math.min(size, Math.floor((size * room) / widest)));
}

/** Ángulo de la rueda (0 = arriba, horario, en grados) a ángulo de canvas en radianes. */
function toCanvasAngle(deg: number): number {
  return ((deg - 90) * Math.PI) / 180;
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    this.resize();
  }

  /** Ajusta el canvas al tamaño de la ventana y a la densidad de píxeles. */
  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  draw(wheels: readonly WheelView[], cursors: readonly CursorView[], debug: readonly DebugHandView[] | null): void {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.width, this.height);
    for (const w of wheels) this.drawWheel(w);
    for (const cur of cursors) this.drawCursor(cur);
    if (debug) for (const hand of debug) this.drawDebugHand(hand);
  }

  private drawWheel(w: WheelView): void {
    const c = this.ctx;
    const { cx, cy, radius: r, innerRadius: ri } = w.geometry;
    const n = w.labels.length;
    const step = 360 / n;
    const [red, green, blue] = w.tint;

    // Cuerpo translúcido.
    c.beginPath();
    c.arc(cx, cy, r, 0, TAU);
    c.fillStyle = `rgba(${red}, ${green}, ${blue}, ${w.opacity})`;
    c.fill();

    // Segmento activo: más brillo y un borde suave.
    if (w.active !== null) {
      const a0 = toCanvasAngle(w.active * step - step / 2);
      const a1 = toCanvasAngle(w.active * step + step / 2);
      c.save();
      c.beginPath();
      c.arc(cx, cy, r, a0, a1);
      c.arc(cx, cy, ri, a1, a0, true);
      c.closePath();
      c.fillStyle = COLORS.activeFill;
      c.fill();
      c.shadowColor = 'rgba(255, 255, 255, 0.8)';
      c.shadowBlur = 14;
      c.strokeStyle = COLORS.activeStroke;
      c.lineWidth = 1.5;
      c.stroke();
      c.restore();
    }

    // Separadores finos.
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = toCanvasAngle(i * step - step / 2);
      c.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
      c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    c.strokeStyle = COLORS.separator;
    c.lineWidth = 1;
    c.stroke();

    // Aro exterior claro.
    c.beginPath();
    c.arc(cx, cy, r - 1, 0, TAU);
    c.strokeStyle = COLORS.rim;
    c.lineWidth = 2;
    c.stroke();

    // Etiquetas: el tamaño se ajusta para que la más larga quepa en su segmento.
    const baseSize = Math.max(11, Math.round(r * 0.078));
    const lr = r * WHEEL.labelRatio;
    const room = Math.min(2 * lr * Math.sin(Math.PI / n), r - ri) * 0.82;
    const fontSize = fitFontSize(c, w.labels, baseSize * 1.18, room) / 1.18;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.save();
    c.shadowColor = 'rgba(0, 0, 0, 0.55)';
    c.shadowBlur = 3;
    for (let i = 0; i < n; i++) {
      const a = toCanvasAngle(i * step);
      const isActive = i === w.active;
      const size = Math.round(isActive ? fontSize * 1.18 : fontSize);
      const x = cx + Math.cos(a) * lr;
      const y = cy + Math.sin(a) * lr;
      c.font = `${isActive ? 600 : 400} ${size}px ${FONT}`;
      c.fillStyle = COLORS.label;
      const sub = w.sublabels?.[i];
      if (sub) {
        c.fillText(w.labels[i]!, x, y - size * 0.42);
        c.font = `400 ${Math.round(size * 0.78)}px ${FONT}`;
        c.fillStyle = COLORS.sublabel;
        c.fillText(sub, x, y + size * 0.6);
      } else {
        c.fillText(w.labels[i]!, x, y);
      }
      if (w.dots?.[i]) {
        // Entre la etiqueta y el centro: visible aunque el borde de la pantalla corte la rueda.
        const dr = r * 0.53;
        c.beginPath();
        c.arc(cx + Math.cos(a) * dr, cy + Math.sin(a) * dr, Math.max(2.5, r * 0.022), 0, TAU);
        c.fillStyle = COLORS.scaleDot;
        c.fill();
      }
    }
    c.restore();

    // Círculo central.
    c.beginPath();
    c.arc(cx, cy, ri, 0, TAU);
    c.fillStyle = COLORS.center;
    c.fill();
    if (w.centerActive) {
      c.save();
      c.shadowColor = 'rgba(255, 255, 255, 0.7)';
      c.shadowBlur = 12;
      c.strokeStyle = COLORS.activeStroke;
      c.lineWidth = 1.5;
      c.stroke();
      c.restore();
    }
    c.font = `500 ${fitFontSize(c, [w.centerText], baseSize, ri * 1.6, 500)}px ${FONT}`;
    c.fillStyle = COLORS.label;
    c.fillText(w.centerText, cx, cy);
  }

  private drawCursor(cur: CursorView): void {
    const c = this.ctx;
    const { cx, cy } = cur.wheel;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cur.x, cur.y);
    c.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    c.lineWidth = 1.5;
    c.stroke();

    c.save();
    c.shadowColor = cur.color;
    c.shadowBlur = 16;
    c.beginPath();
    c.arc(cur.x, cur.y, 9, 0, TAU);
    c.fillStyle = cur.color;
    c.fill();
    c.restore();
    c.beginPath();
    c.arc(cur.x, cur.y, 9, 0, TAU);
    c.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    c.lineWidth = 2;
    c.stroke();
  }

  private drawDebugHand(hand: DebugHandView): void {
    const c = this.ctx;
    const p = hand.points;
    c.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = p[a];
      const pb = p[b];
      if (!pa || !pb) continue;
      c.moveTo(pa.x, pa.y);
      c.lineTo(pb.x, pb.y);
    }
    c.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    c.lineWidth = 2;
    c.stroke();
    for (const pt of p) {
      c.beginPath();
      c.arc(pt.x, pt.y, 3.5, 0, TAU);
      c.fillStyle = hand.color;
      c.fill();
    }
    const wrist = p[0];
    if (!wrist) return;
    c.font = `500 13px ui-monospace, Consolas, monospace`;
    c.textAlign = 'left';
    c.textBaseline = 'top';
    const width = Math.max(...hand.lines.map((l) => c.measureText(l).width)) + 12;
    const x = Math.min(wrist.x + 14, this.width - width - 4);
    const y = Math.min(wrist.y + 10, this.height - hand.lines.length * 17 - 10);
    c.fillStyle = 'rgba(0, 0, 0, 0.6)';
    c.fillRect(x, y, width, hand.lines.length * 17 + 8);
    c.fillStyle = '#fff';
    hand.lines.forEach((line, k) => c.fillText(line, x + 6, y + 4 + k * 17));
  }
}
