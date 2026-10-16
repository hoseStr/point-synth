/**
 * Wrapper de HandLandmarker de MediaPipe: carga (GPU con respaldo en CPU) y
 * detección por cuadro de video con timestamps monotónicos.
 *
 * La librería se importa de forma diferida: el modo mouse arranca sin
 * esperarla y el bundle inicial queda pequeño.
 */
import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { Handedness } from '../input/assign';
import type { Point3 } from '../input/gestures';

const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${__MEDIAPIPE_VERSION__}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type Delegate = 'GPU' | 'CPU';

export interface HandObservation {
  /** 21 landmarks normalizados (0..1) sobre el cuadro de la cámara, sin espejo. */
  readonly landmarks: readonly Point3[];
  /** 21 landmarks en metros, centrados en la mano. */
  readonly world: readonly Point3[];
  /** Etiqueta cruda de MediaPipe (ver src/input/assign.ts sobre el espejo). */
  readonly handedness: Handedness;
  readonly score: number;
}

export class HandTracker {
  private lastTimestamp = -1;

  private constructor(
    private readonly landmarker: HandLandmarker,
    readonly delegate: Delegate,
  ) {}

  static async create(): Promise<HandTracker> {
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    const make = (delegate: Delegate): Promise<HandLandmarker> =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    try {
      return new HandTracker(await make('GPU'), 'GPU');
    } catch (err) {
      console.warn('[Wheel Synth] GPU no disponible para MediaPipe; uso CPU.', err);
      return new HandTracker(await make('CPU'), 'CPU');
    }
  }

  /** Detecta manos en el cuadro actual. `timeMs` debe venir de un reloj monotónico. */
  detect(video: HTMLVideoElement, timeMs: number): HandObservation[] {
    // MediaPipe exige timestamps estrictamente crecientes.
    const ts = Math.max(Math.round(timeMs), this.lastTimestamp + 1);
    this.lastTimestamp = ts;
    return toObservations(this.landmarker.detectForVideo(video, ts));
  }

  close(): void {
    this.landmarker.close();
  }
}

function toObservations(result: HandLandmarkerResult): HandObservation[] {
  return result.landmarks.map((landmarks, i) => {
    const category = result.handedness[i]?.[0];
    return {
      landmarks,
      world: result.worldLandmarks[i] ?? landmarks,
      handedness: category?.categoryName === 'Left' ? 'Left' : 'Right',
      score: category?.score ?? 0,
    };
  });
}
