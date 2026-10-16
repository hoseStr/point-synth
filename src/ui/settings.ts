/**
 * Ajustes del usuario: modelo, validación y persistencia en localStorage.
 * La persistencia es una comodidad: si el almacenamiento falla, la app
 * funciona igual con los valores por defecto.
 */
import { isPresetId, type PresetId } from '../audio/presets';
import { WHEEL } from '../config';

export type ControlPoint = 'palm' | 'index';
export type VolumeMode = 'finger' | 'openness' | 'pinch';
export type HandAssignment = 'auto' | 'handedness' | 'position';
export type ScaleModeSetting = 'major' | 'minor';

export interface Settings {
  readonly preset: PresetId;
  /** Octava base del voicing (2..5). */
  readonly baseOctave: number;
  readonly reverb: number;
  readonly delay: number;
  /** Suavizado del tracking: 0 = mínimo retraso, 1 = máximo suavizado. */
  readonly smoothing: number;
  readonly controlPoint: ControlPoint;
  readonly volumeMode: VolumeMode;
  readonly handAssignment: HandAssignment;
  /** Radio de las ruedas como fracción del alto de la pantalla. */
  readonly wheelSize: number;
  /** Distancia del centro de la pantalla al centro de cada rueda, como fracción del ancho. */
  readonly wheelSpread: number;
  readonly wheelOpacity: number;
  readonly mirror: boolean;
  /** Tónica de la escala resaltada (0 = C), o null para no resaltar. */
  readonly scaleTonic: number | null;
  readonly scaleMode: ScaleModeSetting;
}

export const DEFAULT_SETTINGS: Settings = {
  preset: 'warmPad',
  baseOctave: 4,
  reverb: 0.35,
  delay: 0.15,
  smoothing: 0.5,
  controlPoint: 'index',
  volumeMode: 'finger',
  handAssignment: 'auto',
  wheelSize: WHEEL.defaultSize,
  wheelSpread: WHEEL.defaultSpread,
  wheelOpacity: 0.55,
  mirror: true,
  scaleTonic: null,
  scaleMode: 'major',
};

const STORAGE_KEY = 'wheel-synth:settings:v2';
/** Versión anterior: control con la palma y ruedas pegadas a los bordes. */
const LEGACY_STORAGE_KEY = 'wheel-synth:settings:v1';

function num(value: unknown, fallback: number, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const v = Math.min(max, Math.max(min, value));
  return integer ? Math.round(v) : v;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Valida datos de origen desconocido (p. ej. localStorage) y completa con los valores por defecto. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    preset: isPresetId(r.preset) ? r.preset : d.preset,
    baseOctave: num(r.baseOctave, d.baseOctave, 2, 5, true),
    reverb: num(r.reverb, d.reverb, 0, 1),
    delay: num(r.delay, d.delay, 0, 1),
    smoothing: num(r.smoothing, d.smoothing, 0, 1),
    controlPoint: oneOf(r.controlPoint, ['palm', 'index'], d.controlPoint),
    volumeMode: oneOf(r.volumeMode, ['finger', 'openness', 'pinch'], d.volumeMode),
    handAssignment: oneOf(r.handAssignment, ['auto', 'handedness', 'position'], d.handAssignment),
    wheelSize: num(r.wheelSize, d.wheelSize, WHEEL.minSize, WHEEL.maxSize),
    wheelSpread: num(r.wheelSpread, d.wheelSpread, WHEEL.minSpread, WHEEL.maxSpread),
    wheelOpacity: num(r.wheelOpacity, d.wheelOpacity, 0.15, 0.9),
    mirror: typeof r.mirror === 'boolean' ? r.mirror : d.mirror,
    scaleTonic:
      typeof r.scaleTonic === 'number' && Number.isInteger(r.scaleTonic) && r.scaleTonic >= 0 && r.scaleTonic <= 11
        ? r.scaleTonic
        : null,
    scaleMode: oneOf(r.scaleMode, ['major', 'minor'], d.scaleMode),
  };
}

/**
 * Ajustes guardados por la versión anterior: se conservan el sonido y la
 * apariencia, pero el control pasa al dedo índice y las ruedas a su nueva ubicación.
 */
export function migrateLegacySettings(raw: unknown): Settings {
  const rest: Record<string, unknown> = { ...(typeof raw === 'object' && raw !== null ? raw : {}) };
  delete rest.controlPoint;
  delete rest.volumeMode;
  return sanitizeSettings(rest);
}

export function loadSettings(): Settings {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return sanitizeSettings(JSON.parse(stored));
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return legacy ? migrateLegacySettings(JSON.parse(legacy)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Modo privado o almacenamiento bloqueado: los ajustes duran solo esta sesión.
  }
}

// ---------------------------------------------------------------------------
// Panel de ajustes (DOM)
// ---------------------------------------------------------------------------

type Patch = Partial<Settings>;
type Options = readonly (readonly [value: string, label: string])[];

let fieldCounter = 0;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export interface SettingsPanelOptions {
  readonly presets: readonly { readonly id: string; readonly name: string }[];
  readonly noteNames: readonly string[];
  readonly wheelSize: { readonly min: number; readonly max: number };
  readonly wheelSpread: { readonly min: number; readonly max: number };
}

/**
 * Panel plegable que se abre con el engranaje. Avisa de cada cambio con
 * `onChange`; `sync` lo actualiza cuando los ajustes cambian desde fuera
 * (por ejemplo, con los atajos [ y ]).
 */
export class SettingsPanel {
  private readonly syncers: ((s: Settings) => void)[] = [];

  constructor(
    private readonly panel: HTMLElement,
    private readonly toggleButton: HTMLButtonElement,
    initial: Settings,
    private readonly onChange: (patch: Patch) => void,
    options: SettingsPanelOptions,
  ) {
    const pct = (v: number): string => `${Math.round(v * 100)} %`;

    const header = el('div', 'panel-header');
    header.append(el('h2', '', 'Ajustes'));
    const close = el('button', 'panel-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Cerrar ajustes');
    close.addEventListener('click', () => this.setOpen(false));
    header.append(close);
    panel.append(header);

    this.section('Sonido');
    this.select(
      'Preset',
      options.presets.map((p) => [p.id, p.name] as const),
      (s) => s.preset,
      (v) => ({ preset: v as Settings['preset'] }),
    );
    this.range('Octava base', 2, 5, 1, (s) => s.baseOctave, (v) => ({ baseOctave: v }), String);
    this.range('Reverb', 0, 1, 0.01, (s) => s.reverb, (v) => ({ reverb: v }), pct);
    this.range('Delay', 0, 1, 0.01, (s) => s.delay, (v) => ({ delay: v }), pct);

    this.section('Manos');
    this.range('Suavizado', 0, 1, 0.01, (s) => s.smoothing, (v) => ({ smoothing: v }), pct);
    this.segmented(
      'Punto de control',
      [['index', 'Punta del índice'], ['palm', 'Palma']],
      (s) => s.controlPoint,
      (v) => ({ controlPoint: v as ControlPoint }),
    );
    this.segmented(
      'Volumen con',
      [['finger', 'Dedo'], ['openness', 'Apertura'], ['pinch', 'Pinza']],
      (s) => s.volumeMode,
      (v) => ({ volumeMode: v as VolumeMode }),
    );
    this.select(
      'Asignar manos por',
      [['auto', 'Auto (handedness + posición)'], ['handedness', 'Solo handedness'], ['position', 'Solo posición']],
      (s) => s.handAssignment,
      (v) => ({ handAssignment: v as HandAssignment }),
    );
    this.toggle('Video en espejo', (s) => s.mirror, (v) => ({ mirror: v }));

    this.section('Ruedas');
    this.range('Tamaño', options.wheelSize.min, options.wheelSize.max, 0.01, (s) => s.wheelSize, (v) => ({ wheelSize: v }), pct);
    this.range(
      'Separación',
      options.wheelSpread.min,
      options.wheelSpread.max,
      0.01,
      (s) => s.wheelSpread,
      (v) => ({ wheelSpread: v }),
      pct,
    );
    this.range('Opacidad', 0.15, 0.9, 0.01, (s) => s.wheelOpacity, (v) => ({ wheelOpacity: v }), pct);
    this.select(
      'Resaltar escala',
      [['none', 'Ninguna'] as const, ...options.noteNames.map((n, i) => [String(i), n] as const)],
      (s) => (s.scaleTonic === null ? 'none' : String(s.scaleTonic)),
      (v) => ({ scaleTonic: v === 'none' ? null : Number(v) }),
    );
    this.segmented(
      'Tipo de escala',
      [['major', 'Mayor'], ['minor', 'Menor']],
      (s) => s.scaleMode,
      (v) => ({ scaleMode: v as ScaleModeSetting }),
    );

    const footer = el('div', 'panel-footer');
    const reset = el('button', 'secondary', 'Restablecer valores');
    reset.type = 'button';
    reset.addEventListener('click', () => this.onChange({ ...DEFAULT_SETTINGS }));
    footer.append(reset);
    panel.append(footer);

    toggleButton.addEventListener('click', () => this.setOpen(!this.isOpen));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.setOpen(false);
    });
    this.sync(initial);
  }

  sync(settings: Settings): void {
    for (const s of this.syncers) s(settings);
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  setOpen(open: boolean): void {
    this.panel.hidden = !open;
    this.toggleButton.setAttribute('aria-expanded', String(open));
  }

  private section(title: string): void {
    this.panel.append(el('h3', 'panel-section', title));
  }

  private field(label: string, control: HTMLElement, output?: HTMLElement): void {
    const row = el('div', 'field');
    const id = `setting-${++fieldCounter}`;
    const caption = el('label', 'field-label', label);
    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      control.id = id;
      caption.htmlFor = id;
    } else {
      caption.id = id;
      control.setAttribute('aria-labelledby', id);
    }
    const top = el('div', 'field-top');
    top.append(caption);
    if (output) top.append(output);
    row.append(top, control);
    this.panel.append(row);
  }

  private select(label: string, options: Options, read: (s: Settings) => string, write: (value: string) => Patch): void {
    const select = el('select');
    for (const [value, text] of options) {
      const option = el('option', '', text);
      option.value = value;
      select.append(option);
    }
    select.addEventListener('change', () => this.onChange(write(select.value)));
    this.syncers.push((s) => (select.value = read(s)));
    this.field(label, select);
  }

  private range(
    label: string,
    min: number,
    max: number,
    step: number,
    read: (s: Settings) => number,
    write: (value: number) => Patch,
    format: (value: number) => string,
  ): void {
    const input = el('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    const output = el('output', 'field-value');
    input.addEventListener('input', () => {
      output.textContent = format(input.valueAsNumber);
      this.onChange(write(input.valueAsNumber));
    });
    this.syncers.push((s) => {
      input.value = String(read(s));
      output.textContent = format(read(s));
    });
    this.field(label, input, output);
  }

  private segmented(label: string, options: Options, read: (s: Settings) => string, write: (value: string) => Patch): void {
    const group = el('div', 'segmented');
    group.setAttribute('role', 'radiogroup');
    const buttons = options.map(([value, text]) => {
      const b = el('button', '', text);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.addEventListener('click', () => this.onChange(write(value)));
      group.append(b);
      return [value, b] as const;
    });
    this.syncers.push((s) => {
      for (const [value, b] of buttons) b.setAttribute('aria-checked', String(read(s) === value));
    });
    this.field(label, group);
  }

  private toggle(label: string, read: (s: Settings) => boolean, write: (value: boolean) => Patch): void {
    const input = el('input', 'switch');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.addEventListener('change', () => this.onChange(write(input.checked)));
    this.syncers.push((s) => (input.checked = read(s)));
    this.field(label, input);
  }
}
