import './style.css';
import { AudioEngine } from './audio/engine';
import { PRESETS, PRESET_IDS } from './audio/presets';
import { COLORS, HANDS, POINTER_VOLUME, ROOT_LABELS, WHEEL, WHEEL_COLORS, WHEEL_QUALITIES, wheelColorRgb } from './config';
import { assignHands } from './input/assign';
import { ChordController, type ControlState, type LeftInput, type RightInput } from './input/controller';
import { videoToScreen, type Size } from './input/coords';
import { controlPoint, indexExtension, normalize, opennessRatio, pinchRatio } from './input/gestures';
import { PointerInput, type Side } from './input/pointer';
import {
  NONE,
  SelectionStabilizer,
  layoutWheels,
  rawSelection,
  type WheelGeometry,
  type WheelLayout,
  type WheelSelection,
} from './input/wheel';
import {
  chordName,
  chordNotes,
  chordPitchClasses,
  formatChordName,
  formatNote,
  scalePitchClasses,
  voiceChord,
  type QualityId,
} from './music/theory';
import { OneEuroFilter, OneEuroFilter2D, cursorFilterParams, volumeFilterParams } from './tracking/filters';
import { HandTracker, type HandObservation } from './tracking/hands';
import { Hud } from './ui/hud';
import { Renderer, type CursorView, type DebugHandView, type WheelView } from './ui/render';
import { SettingsPanel, loadSettings, saveSettings, type Settings } from './ui/settings';

const MAX_CHORD_NOTES = Math.max(...WHEEL_QUALITIES.map((q) => chordPitchClasses(0, q).length));
const SILENT_VOLUME = 0.04;

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id}`);
  return el as T;
}

const canvas = byId<HTMLCanvasElement>('overlay');
const video = byId<HTMLVideoElement>('video');
const startScreen = byId('start-screen');

let settings: Settings = loadSettings();
const hud = new Hud();
const renderer = new Renderer(canvas);
let layout: WheelLayout = computeLayout();
const pointer = new PointerInput(canvas, () => layout);
const controller = new ChordController(HANDS.lostReleaseMs);
const panel = new SettingsPanel(byId('settings-panel'), byId<HTMLButtonElement>('settings-toggle'), settings, updateSettings, {
  presets: PRESET_IDS.map((id) => ({ id, name: PRESETS[id].name })),
  noteNames: ROOT_LABELS,
  wheelSize: { min: WHEEL.minSize, max: WHEEL.maxSize },
  wheelSpread: { min: WHEEL.minSpread, max: WHEEL.maxSpread },
  wheelColors: WHEEL_COLORS,
});

type Mode = 'idle' | 'pointer' | 'camera';
let mode: Mode = 'idle';
let engine: AudioEngine | null = null;
let tracker: HandTracker | null = null;
let debug = false;

/** Acorde que suena ahora. */
let current: { key: string; root: number; quality: QualityId } | null = null;
/** Último voicing, para el voice leading del siguiente acorde (sobrevive a los silencios). */
let lastVoicing: readonly number[] | null = null;
let lastVolume = 0;
let scaleDots = computeScaleDots();

function computeLayout(): WheelLayout {
  return layoutWheels(window.innerWidth, window.innerHeight, {
    ...WHEEL,
    size: settings.wheelSize,
    spread: settings.wheelSpread,
  });
}

function computeScaleDots(): boolean[] | undefined {
  if (settings.scaleTonic === null) return undefined;
  const pcs = new Set(scalePitchClasses(settings.scaleTonic, settings.scaleMode));
  return ROOT_LABELS.map((_, i) => pcs.has(i));
}

function viewSize(): Size {
  return { width: window.innerWidth, height: window.innerHeight };
}

// ---------------------------------------------------------------------------
// Manos
// ---------------------------------------------------------------------------

interface TrackedHand {
  readonly side: Side;
  present: boolean;
  lastSeen: number;
  cursor: { x: number; y: number } | null;
  selection: WheelSelection;
  volume: number;
  /** Medida cruda de apertura o pinza (para el modo debug). */
  gauge: number;
  observation: HandObservation | null;
  readonly cursorFilter: OneEuroFilter2D;
  readonly volumeFilter: OneEuroFilter;
  readonly stabilizer: SelectionStabilizer;
}

function createHand(side: Side, segments: number): TrackedHand {
  return {
    side,
    present: false,
    lastSeen: -Infinity,
    cursor: null,
    selection: NONE,
    volume: 0,
    gauge: 0,
    observation: null,
    cursorFilter: new OneEuroFilter2D(cursorFilterParams(settings.smoothing)),
    volumeFilter: new OneEuroFilter(volumeFilterParams(settings.smoothing)),
    stabilizer: new SelectionStabilizer(segments, WHEEL),
  };
}

const hands: Record<Side, TrackedHand> = {
  left: createHand('left', ROOT_LABELS.length),
  right: createHand('right', WHEEL_QUALITIES.length),
};
/** Manos detectadas que no se asignaron a ninguna rueda (solo para debug). */
let unassigned: HandObservation[] = [];

interface Candidate {
  readonly obs: HandObservation;
  readonly screen: { x: number; y: number };
  readonly handedness: HandObservation['handedness'];
  readonly score: number;
  readonly screenX: number;
}

function updateHand(h: TrackedHand, c: Candidate | null, now: number, geometry: WheelGeometry): void {
  if (!c) {
    h.present = false;
    return;
  }
  // Si la mano estuvo ausente un rato, empieza de cero: sin arrastrar filtros viejos.
  if (now - h.lastSeen > HANDS.lostReleaseMs) {
    h.cursorFilter.reset();
    h.volumeFilter.reset();
    h.stabilizer.reset();
  }
  h.present = true;
  h.lastSeen = now;
  h.observation = c.obs;
  h.cursor = h.cursorFilter.filter(c.screen.x, c.screen.y, now);
  h.selection = h.stabilizer.update(geometry, h.cursor.x, h.cursor.y, now);
  if (h.side === 'left') {
    h.gauge = volumeGauge(c.obs.world);
    h.volume = Math.min(1, Math.max(0, h.volumeFilter.filter(gaugeToVolume(h.gauge), now)));
  }
}

/** Medida cruda de la mano izquierda que controla el volumen, según el ajuste. */
function volumeGauge(world: HandObservation['world']): number {
  switch (settings.volumeMode) {
    case 'finger':
      return indexExtension(world);
    case 'openness':
      return opennessRatio(world);
    case 'pinch':
      return pinchRatio(world);
  }
}

function gaugeToVolume(gauge: number): number {
  switch (settings.volumeMode) {
    case 'finger':
      return normalize(gauge, HANDS.indexExtension.curled, HANDS.indexExtension.extended);
    case 'openness':
      return normalize(gauge, HANDS.openness.fist, HANDS.openness.open);
    case 'pinch':
      return normalize(gauge, HANDS.pinch.closed, HANDS.pinch.open);
  }
}

const GAUGE_LABELS: Record<Settings['volumeMode'], string> = {
  finger: 'dedo',
  openness: 'apertura',
  pinch: 'pinza',
};

let detections = 0;
let fps = 0;
let fpsWindowStart = 0;

function detect(now: number): void {
  if (!tracker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;
  let observations: HandObservation[];
  try {
    observations = tracker.detect(video, now);
  } catch (err) {
    console.error('[Wheel Synth] Falló la detección', err);
    return;
  }

  detections++;
  if (now - fpsWindowStart >= 500) {
    fps = Math.round((detections * 1000) / (now - fpsWindowStart));
    detections = 0;
    fpsWindowStart = now;
  }

  const view = viewSize();
  const source = { width: video.videoWidth, height: video.videoHeight };
  const candidates: Candidate[] = observations.map((obs) => {
    const cp = controlPoint(obs.landmarks, settings.controlPoint);
    const screen = videoToScreen(cp.x, cp.y, source, view, settings.mirror);
    return { obs, screen, handedness: obs.handedness, score: obs.score, screenX: screen.x };
  });
  const a = assignHands(candidates, settings.handAssignment, settings.mirror, view.width, HANDS.handednessMinScore);
  updateHand(hands.left, a.left === null ? null : candidates[a.left]!, now, layout.left);
  updateHand(hands.right, a.right === null ? null : candidates[a.right]!, now, layout.right);
  unassigned = candidates.filter((_, i) => i !== a.left && i !== a.right).map((c) => c.obs);
}

/** Una detección por cuadro nuevo de la cámara (no por frame de pantalla). */
function scheduleDetection(): void {
  // Firefox antiguo no tiene requestVideoFrameCallback: se sondea el video en cada frame.
  const supportsFrameCallback = typeof HTMLVideoElement.prototype.requestVideoFrameCallback === 'function';
  if (supportsFrameCallback) {
    video.requestVideoFrameCallback((now) => {
      detect(now);
      scheduleDetection();
    });
  } else {
    let lastVideoTime = -1;
    const poll = (now: number): void => {
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        detect(now);
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }
}

// ---------------------------------------------------------------------------
// Estado musical → audio y textos
// ---------------------------------------------------------------------------

function showChord(root: number, quality: QualityId): void {
  hud.setChord(formatChordName(chordName(root, quality)), chordNotes(root, quality).map(formatNote).join(' – '));
}

function applyState(state: ControlState): void {
  const quality = WHEEL_QUALITIES[state.quality]!;
  if (state.root !== null) {
    const key = `${state.root}|${quality}|${settings.baseOctave}`;
    if (current?.key !== key) {
      const voicing = voiceChord(state.root, quality, lastVoicing, settings.baseOctave);
      engine?.setChord(voicing.bass, voicing.notes);
      lastVoicing = voicing.notes;
      current = { key, root: state.root, quality };
      showChord(state.root, quality);
    }
  } else if (current) {
    engine?.release();
    current = null;
  }
  lastVolume = state.volume;
  engine?.setVolume(state.volume);
}

// ---------------------------------------------------------------------------
// Bucle de render (60 fps)
// ---------------------------------------------------------------------------

function selectionLabel(sel: WheelSelection, labels: readonly string[]): string {
  switch (sel.kind) {
    case 'segment':
      return labels[sel.index] ?? '?';
    case 'center':
      return 'centro';
    case 'outside':
      return 'fuera';
    case 'none':
      return '—';
  }
}

function debugViews(): DebugHandView[] {
  const view = viewSize();
  const source = { width: video.videoWidth || 1, height: video.videoHeight || 1 };
  const toScreen = (obs: HandObservation): { x: number; y: number }[] =>
    obs.landmarks.map((p) => videoToScreen(p.x, p.y, source, view, settings.mirror));
  const views: DebugHandView[] = [];
  for (const h of [hands.left, hands.right]) {
    const obs = h.observation;
    if (!h.present || !obs) continue;
    const labels = h.side === 'left' ? ROOT_LABELS : WHEEL_QUALITIES;
    const lines = [
      `${h.side === 'left' ? 'Rueda izq.' : 'Rueda der.'} · ${obs.handedness} ${obs.score.toFixed(2)}`,
      `ángulo ${h.stabilizer.angle.toFixed(0)}°`,
      `crudo ${selectionLabel(h.stabilizer.raw, labels)} → estable ${selectionLabel(h.selection, labels)}`,
    ];
    if (h.side === 'left') {
      lines.push(`${GAUGE_LABELS[settings.volumeMode]} ${h.gauge.toFixed(2)} → vol ${h.volume.toFixed(2)}`);
    }
    views.push({ points: toScreen(obs), color: h.side === 'left' ? COLORS.cursorLeft : COLORS.cursorRight, lines });
  }
  for (const obs of unassigned) {
    views.push({ points: toScreen(obs), color: '#aaa', lines: [`sin asignar · ${obs.handedness} ${obs.score.toFixed(2)}`] });
  }
  return views;
}

function updateStatus(): void {
  if (mode !== 'camera' || !tracker) return;
  const count = Number(hands.left.present) + Number(hands.right.present);
  const what = count === 0 ? 'Esperando manos…' : count === 1 ? '1 mano' : '2 manos';
  const rate = fps > 0 ? ` · ${fps} fps` : '';
  const extra = debug ? ` · ${tracker.delegate}` : '';
  hud.setStatus(`${what}${rate}${extra}`, count ? 'ok' : 'idle');
}

function frame(now: number): void {
  const cursors: CursorView[] = [];
  let left: LeftInput | null = null;
  let right: RightInput | null = null;
  let leftSel: WheelSelection = NONE;
  let rightSel: WheelSelection = NONE;

  // El puntero tiene prioridad sobre la mano mientras está pulsado.
  const lp = pointer.read('left');
  const lh = hands.left;
  if (lp) {
    leftSel = rawSelection(layout.left, lp.x, lp.y, ROOT_LABELS.length);
    left = { selection: leftSel, volume: POINTER_VOLUME };
    cursors.push({ x: lp.x, y: lp.y, wheel: layout.left, color: COLORS.cursorLeft });
  } else if (lh.present && lh.cursor) {
    leftSel = lh.selection;
    left = { selection: leftSel, volume: lh.volume };
    cursors.push({ ...lh.cursor, wheel: layout.left, color: COLORS.cursorLeft });
  }

  const rp = pointer.read('right');
  const rh = hands.right;
  if (rp) {
    rightSel = rawSelection(layout.right, rp.x, rp.y, WHEEL_QUALITIES.length);
    right = { selection: rightSel };
    cursors.push({ x: rp.x, y: rp.y, wheel: layout.right, color: COLORS.cursorRight });
  } else if (rh.present && rh.cursor) {
    rightSel = rh.selection;
    right = { selection: rightSel };
    cursors.push({ ...rh.cursor, wheel: layout.right, color: COLORS.cursorRight });
  }

  const state: ControlState = engine
    ? controller.update(now, left, right)
    : { root: null, quality: controller.currentQuality, volume: 0 };
  if (engine) {
    applyState(state);
    // Puntero soltado: silencio inmediato, sin esperar los 150 ms de la mano.
    if (lp && !lp.held) controller.releaseLeft();
    hud.setMeter(engine.meterLevel(), left ? left.volume : null);
    hud.setSilent(current === null || lastVolume < SILENT_VOLUME);
  }
  updateStatus();

  const wheels: WheelView[] = [
    {
      geometry: layout.left,
      labels: ROOT_LABELS,
      tint: wheelColorRgb(settings.rootWheelColor),
      opacity: settings.wheelOpacity,
      active: state.root,
      centerActive: leftSel.kind === 'center',
      centerText: 'OFF',
      dots: scaleDots,
    },
    {
      geometry: layout.right,
      labels: WHEEL_QUALITIES,
      tint: wheelColorRgb(settings.qualityWheelColor),
      opacity: settings.wheelOpacity,
      active: state.quality,
      centerActive: rightSel.kind === 'center',
      centerText: WHEEL_QUALITIES[state.quality]!,
    },
  ];
  renderer.draw(wheels, cursors, debug ? debugViews() : null);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

function startAudio(): void {
  startScreen.hidden = true;
  // El AudioContext se crea dentro del clic por la política de autoplay.
  engine = new AudioEngine({
    preset: settings.preset,
    reverb: settings.reverb,
    delay: settings.delay,
    maxChordNotes: MAX_CHORD_NOTES,
  });
  void engine.resume();
}

function enterPointerMode(reason?: string): void {
  mode = 'pointer';
  hud.setStatus(reason ?? 'Modo mouse / touch', reason ? 'error' : 'idle');
  hud.setHint('Mantén pulsada una nota en la rueda izquierda; elige el tipo de acorde en la derecha.');
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Permiso de cámara denegado · modo mouse';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No se encontró cámara · modo mouse';
  if (name === 'NotReadableError') return 'La cámara está en uso por otra app · modo mouse';
  return 'No se pudo abrir la cámara · modo mouse';
}

async function startCamera(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    enterPointerMode('Cámara no disponible (requiere HTTPS) · modo mouse');
    return;
  }
  mode = 'camera';
  hud.setHint('Apunta con el índice izquierdo a una nota y con el derecho a un tipo de acorde.');
  hud.setStatus('Pidiendo acceso a la cámara…', 'loading');
  // El modelo se descarga mientras el usuario responde al permiso de cámara.
  const trackerPromise = HandTracker.create();
  trackerPromise.catch(() => undefined);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    });
    video.srcObject = stream;
    await video.play();
    video.classList.add('is-live');
  } catch (err) {
    console.warn('[Wheel Synth] Sin cámara', err);
    enterPointerMode(cameraErrorMessage(err));
    return;
  }

  hud.setStatus('Cargando modelo…', 'loading');
  try {
    tracker = await trackerPromise;
  } catch (err) {
    console.error('[Wheel Synth] No se pudo cargar el modelo', err);
    hud.setStatus('No se pudo cargar el modelo de manos', 'error');
    hud.setHint('Revisa tu conexión. Mientras tanto puedes tocar con el mouse o el touch.');
    return;
  }
  hud.setStatus('Esperando manos…', 'idle');
  scheduleDetection();
}

byId('start-button').addEventListener('click', () => {
  startAudio();
  void startCamera();
});
byId('start-pointer').addEventListener('click', () => {
  startAudio();
  enterPointerMode();
});

// ---------------------------------------------------------------------------
// Ajustes y atajos
// ---------------------------------------------------------------------------

function updateSettings(patch: Partial<Settings>): void {
  const prev = settings;
  settings = { ...settings, ...patch };
  saveSettings(settings);
  if (engine) {
    if (settings.preset !== prev.preset) engine.setPreset(settings.preset);
    if (settings.reverb !== prev.reverb) engine.setReverb(settings.reverb);
    if (settings.delay !== prev.delay) engine.setDelay(settings.delay);
  }
  if (settings.baseOctave !== prev.baseOctave) lastVoicing = null;
  if (settings.wheelSize !== prev.wheelSize || settings.wheelSpread !== prev.wheelSpread) layout = computeLayout();
  if (settings.scaleTonic !== prev.scaleTonic || settings.scaleMode !== prev.scaleMode) scaleDots = computeScaleDots();
  for (const h of [hands.left, hands.right]) {
    if (settings.smoothing !== prev.smoothing) {
      h.cursorFilter.params = cursorFilterParams(settings.smoothing);
      h.volumeFilter.params = volumeFilterParams(settings.smoothing);
    }
    // Cambiar el espejo o el punto de control hace saltar el cursor: se empieza de cero.
    if (settings.mirror !== prev.mirror || settings.controlPoint !== prev.controlPoint) {
      h.cursorFilter.reset();
      h.stabilizer.reset();
    }
  }
  video.classList.toggle('is-mirrored', settings.mirror);
  panel.sync(settings);
}

function cyclePreset(direction: 1 | -1): void {
  const i = PRESET_IDS.indexOf(settings.preset);
  const next = PRESET_IDS[(i + direction + PRESET_IDS.length) % PRESET_IDS.length]!;
  updateSettings({ preset: next });
  hud.showToast(`Preset: ${PRESETS[next].name}`);
}

function panic(): void {
  engine?.panic();
  controller.panic();
  current = null;
  hud.showToast('Pánico: todo en silencio');
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => hud.showToast('Pantalla completa no disponible'));
}

window.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    panic();
    return;
  }
  if (e.repeat) return;
  switch (e.key.toLowerCase()) {
    case 'm':
      if (engine) hud.showToast(engine.toggleMute() ? 'Silenciado (M)' : 'Sonido activado');
      break;
    case 'f':
      toggleFullscreen();
      break;
    case '[':
      cyclePreset(-1);
      break;
    case ']':
      cyclePreset(1);
      break;
    case 'd':
      debug = !debug;
      hud.showToast(debug ? 'Debug activado (D)' : 'Debug desactivado');
      break;
  }
});

window.addEventListener('resize', () => {
  layout = computeLayout();
  renderer.resize();
});

video.classList.toggle('is-mirrored', settings.mirror);
hud.setStatus('Listo', 'idle');
hud.setHint('Pulsa «Empezar» para activar la cámara y el sonido.');
requestAnimationFrame(frame);
