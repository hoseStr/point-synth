/**
 * Ajustes del usuario: modelo, validación y persistencia en localStorage.
 * La persistencia es una comodidad: si el almacenamiento falla, la app
 * funciona igual con los valores por defecto.
 */
import { isPresetId, type PresetId } from '../audio/presets';
import {
  DEFAULT_DEGREE_TYPES,
  DEFAULT_WHEEL_CHORDS,
  WHEEL,
  WHEEL_COLOR_IDS,
  WHEEL_LIMITS,
  type WheelColor,
  type WheelColorId,
} from '../config';
import { CHORDS, CHORD_CATEGORIES, QUALITY_IDS, isQualityId, type QualityId } from '../music/chords';
import { DEGREE_TYPES, DEGREE_TYPE_IDS, isDegreeTypeId, type DegreeTypeId } from '../music/diatonic';
import { SCALES, SCALE_GROUPS, SCALE_IDS, isScaleId, type ScaleId } from '../music/scales';
import { qualityLabel } from '../music/theory';

export type ControlPoint = 'palm' | 'index';
export type VolumeMode = 'finger' | 'openness' | 'pinch';
export type HandAssignment = 'auto' | 'handedness' | 'position';
/** Libre: raíz cromática + acorde elegido. Por grados: grado de la tonalidad + tipo de acorde. */
export type HarmonyMode = 'free' | 'degrees';

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
  readonly rootWheelColor: WheelColorId;
  readonly qualityWheelColor: WheelColorId;
  readonly mirror: boolean;
  readonly harmonyMode: HarmonyMode;
  /** Tónica de la tonalidad (0 = C), o null si no hay tonalidad elegida. */
  readonly keyTonic: number | null;
  readonly keyScale: ScaleId;
  /** Acordes de la rueda derecha en modo libre, en sentido horario. */
  readonly wheelChords: readonly QualityId[];
  /** Tipos de acorde de la rueda derecha en modo por grados. */
  readonly wheelDegreeTypes: readonly DegreeTypeId[];
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
  rootWheelColor: 'graphite',
  qualityWheelColor: 'slate',
  mirror: true,
  harmonyMode: 'free',
  keyTonic: null,
  keyScale: 'major',
  wheelChords: DEFAULT_WHEEL_CHORDS,
  wheelDegreeTypes: DEFAULT_DEGREE_TYPES,
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

function tonic(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 11 ? value : null;
}

/**
 * Valida la lista de una rueda: quita ids desconocidos y repetidos y respeta el
 * máximo. Si quedan menos de WHEEL_LIMITS.min, vuelve la lista por defecto.
 */
export function sanitizeWheelList<T extends string>(
  value: unknown,
  isValid: (v: unknown) => v is T,
  fallback: readonly T[],
): readonly T[] {
  if (!Array.isArray(value)) return fallback;
  const list = [...new Set(value.filter(isValid))].slice(0, WHEEL_LIMITS.max);
  return list.length >= WHEEL_LIMITS.min ? list : fallback;
}

/** Valida datos de origen desconocido (p. ej. localStorage) y completa con los valores por defecto. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  // Versiones anteriores guardaban scaleTonic y scaleMode ('major' | 'minor').
  const keyTonic = r.keyTonic !== undefined ? tonic(r.keyTonic) : tonic(r.scaleTonic);
  const keyScale: ScaleId = isScaleId(r.keyScale) ? r.keyScale : r.scaleMode === 'minor' ? 'aeolian' : d.keyScale;
  // Por grados exige una tonalidad y una escala que lo admita.
  const wantsDegrees = r.harmonyMode === 'degrees' && SCALES[keyScale].degrees;
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
    rootWheelColor: oneOf(r.rootWheelColor, WHEEL_COLOR_IDS, d.rootWheelColor),
    qualityWheelColor: oneOf(r.qualityWheelColor, WHEEL_COLOR_IDS, d.qualityWheelColor),
    mirror: typeof r.mirror === 'boolean' ? r.mirror : d.mirror,
    harmonyMode: wantsDegrees ? 'degrees' : 'free',
    keyTonic: wantsDegrees ? (keyTonic ?? 0) : keyTonic,
    keyScale,
    wheelChords: sanitizeWheelList(r.wheelChords, isQualityId, d.wheelChords),
    wheelDegreeTypes: sanitizeWheelList(r.wheelDegreeTypes, isDegreeTypeId, d.wheelDegreeTypes),
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
/** Opciones de un selector; el tercer elemento, si está, agrupa en <optgroup>. */
type Options = readonly (readonly [value: string, label: string, group?: string])[];

let fieldCounter = 0;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text: string, className: string, onClick: () => void, ariaLabel?: string): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
  b.addEventListener('click', onClick);
  return b;
}

/** Algo que se puede poner en la rueda derecha desde el editor. */
interface WheelItem {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly group: string;
}

const CHORD_ITEMS: readonly WheelItem[] = QUALITY_IDS.map((id) => ({
  id,
  label: qualityLabel(id),
  name: CHORDS[id].name,
  group: CHORD_CATEGORIES[CHORDS[id].category],
}));

const DEGREE_ITEMS: readonly WheelItem[] = DEGREE_TYPE_IDS.map((id) => ({
  id,
  label: DEGREE_TYPES[id].label,
  name: DEGREE_TYPES[id].name,
  group: 'Tipos de acorde dentro de la tonalidad',
}));

export interface SettingsPanelOptions {
  readonly presets: readonly { readonly id: string; readonly name: string; readonly group: string }[];
  readonly tonicNames: readonly string[];
  readonly wheelSize: { readonly min: number; readonly max: number };
  readonly wheelSpread: { readonly min: number; readonly max: number };
  readonly wheelColors: readonly WheelColor[];
}

/**
 * Panel plegable que se abre con el engranaje. Avisa de cada cambio con
 * `onChange`; `sync` lo actualiza cuando los ajustes cambian desde fuera
 * (por ejemplo, con los atajos [ y ]).
 */
export class SettingsPanel {
  private readonly syncers: ((s: Settings) => void)[] = [];
  private readonly body: HTMLElement;
  private readonly editor: HTMLElement;
  private readonly editButton: HTMLButtonElement;
  private current: Settings;
  private editing = false;

  constructor(
    private readonly panel: HTMLElement,
    private readonly toggleButton: HTMLButtonElement,
    initial: Settings,
    private readonly onChange: (patch: Patch) => void,
    options: SettingsPanelOptions,
  ) {
    this.current = initial;
    const pct = (v: number): string => `${Math.round(v * 100)} %`;

    const header = el('div', 'panel-header');
    header.append(el('h2', '', 'Ajustes'));
    header.append(button('×', 'panel-close', () => this.setOpen(false), 'Cerrar ajustes'));
    this.body = el('div', 'panel-body');
    this.editor = el('div', 'panel-editor');
    this.editor.hidden = true;
    panel.append(header, this.body, this.editor);

    this.section('Sonido');
    this.select(
      'Preset',
      options.presets.map((p) => [p.id, p.name, p.group] as const),
      (s) => s.preset,
      (v) => ({ preset: v as Settings['preset'] }),
    );
    this.range('Octava base', 2, 5, 1, (s) => s.baseOctave, (v) => ({ baseOctave: v }), String);
    this.range('Reverb', 0, 1, 0.01, (s) => s.reverb, (v) => ({ reverb: v }), pct);
    this.range('Delay', 0, 1, 0.01, (s) => s.delay, (v) => ({ delay: v }), pct);

    this.section('Armonía');
    const modeButtons = this.segmented(
      'Modo',
      [['free', 'Libre'], ['degrees', 'Por grados']],
      (s) => s.harmonyMode,
      (v) => this.harmonyPatch(v as HarmonyMode),
    );
    this.syncers.push((s) => {
      const degreesButton = modeButtons.find(([value]) => value === 'degrees')![1];
      const supported = SCALES[s.keyScale].degrees;
      degreesButton.disabled = !supported;
      degreesButton.title = supported ? '' : 'Esta escala no admite tocar por grados';
    });
    this.select(
      'Tonalidad',
      [['none', 'Ninguna'] as const, ...options.tonicNames.map((n, i) => [String(i), n] as const)],
      (s) => (s.keyTonic === null ? 'none' : String(s.keyTonic)),
      (v) => (v === 'none' ? { keyTonic: null, harmonyMode: 'free' } : { keyTonic: Number(v) }),
    );
    this.select(
      'Escala',
      SCALE_IDS.map((id) => [id, SCALES[id].name, SCALE_GROUPS[SCALES[id].group]] as const),
      (s) => s.keyScale,
      (v) => ({ keyScale: v as ScaleId, ...(SCALES[v as ScaleId].degrees ? {} : { harmonyMode: 'free' as const }) }),
    );
    const note = el('p', 'panel-note');
    this.body.append(note);
    this.syncers.push((s) => {
      const scale = SCALES[s.keyScale];
      let text = scale.description;
      if (!scale.degrees) {
        text += ' Solo marca sus notas: para tocar por grados elige una escala de 7 notas (mayor, menor o un modo).';
      } else if (s.harmonyMode === 'free' && s.keyTonic === null) {
        text += ' Elige una tonalidad para marcar sus notas en la rueda.';
      }
      note.textContent = text;
    });
    this.editButton = button('', 'secondary edit-wheel', () => this.openEditor());
    this.body.append(this.editButton);
    this.syncers.push((s) => {
      const degrees = s.harmonyMode === 'degrees';
      const count = (degrees ? s.wheelDegreeTypes : s.wheelChords).length;
      const what = degrees ? 'Editar tipos de acorde' : 'Editar rueda de acordes';
      this.editButton.textContent = `${what} (${count}/${WHEEL_LIMITS.max})`;
    });

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
    this.swatches(
      'Color de la rueda de notas',
      options.wheelColors,
      (s) => s.rootWheelColor,
      (v) => ({ rootWheelColor: v as WheelColorId }),
    );
    this.swatches(
      'Color de la rueda de acordes',
      options.wheelColors,
      (s) => s.qualityWheelColor,
      (v) => ({ qualityWheelColor: v as WheelColorId }),
    );

    const footer = el('div', 'panel-footer');
    footer.append(button('Restablecer valores', 'secondary', () => this.onChange({ ...DEFAULT_SETTINGS })));
    this.body.append(footer);

    toggleButton.addEventListener('click', () => this.setOpen(!this.isOpen));
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.isOpen) return;
      if (this.editing) this.closeEditor();
      else this.setOpen(false);
    });
    this.sync(initial);
  }

  sync(settings: Settings): void {
    this.current = settings;
    for (const s of this.syncers) s(settings);
    if (this.editing) this.renderEditor();
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  setOpen(open: boolean): void {
    this.panel.hidden = !open;
    this.toggleButton.setAttribute('aria-expanded', String(open));
    if (!open && this.editing) this.closeEditor();
  }

  /** Pasar a «Por grados» sin tonalidad elegida usa C. */
  private harmonyPatch(mode: HarmonyMode): Patch {
    if (mode === 'free') return { harmonyMode: 'free' };
    return { harmonyMode: 'degrees', keyTonic: this.current.keyTonic ?? 0 };
  }

  // -------------------------------------------------------------------------
  // Editor de la rueda derecha
  // -------------------------------------------------------------------------

  private openEditor(): void {
    this.editing = true;
    this.body.hidden = true;
    this.editor.hidden = false;
    this.renderEditor();
    this.editor.querySelector<HTMLElement>('[data-focus="back"]')?.focus();
  }

  private closeEditor(): void {
    this.editing = false;
    this.editor.hidden = true;
    this.body.hidden = false;
    this.editButton.focus();
  }

  /**
   * Redibuja el editor con la lista actual. Se rehace entero en cada cambio,
   * así que conserva el foco del teclado por su clave `data-focus`.
   */
  private renderEditor(): void {
    const s = this.current;
    const degrees = s.harmonyMode === 'degrees';
    const list: readonly string[] = degrees ? s.wheelDegreeTypes : s.wheelChords;
    const catalog = degrees ? DEGREE_ITEMS : CHORD_ITEMS;
    const byId = new Map(catalog.map((item) => [item.id, item]));
    const commit = (next: readonly string[]): void =>
      this.onChange(degrees ? { wheelDegreeTypes: next as DegreeTypeId[] } : { wheelChords: next as QualityId[] });
    const focused = (document.activeElement as HTMLElement | null)?.dataset.focus;
    const keyed = <T extends HTMLElement>(node: T, key: string): T => {
      node.dataset.focus = key;
      return node;
    };

    const top = el('div', 'editor-top');
    top.append(keyed(button('← Volver', 'editor-back', () => this.closeEditor()), 'back'));
    top.append(el('h3', 'editor-title', degrees ? 'Tipos de acorde (por grados)' : 'Acordes de la rueda'));

    let hintText = `${list.length} de ${WHEEL_LIMITS.max}, en sentido horario desde arriba. Mínimo ${WHEEL_LIMITS.min}.`;
    if (degrees) hintText += ' Cada tipo se arma con notas de la tonalidad; si no existe en ese grado, suena la tríada.';
    const hint = el('p', 'panel-note', hintText);

    const ol = el('ol', 'wheel-list');
    list.forEach((id, i) => {
      const item = byId.get(id);
      const name = item?.label ?? id;
      const li = el('li');
      const text = el('span', 'wheel-item');
      text.append(el('span', 'item-label', name), el('span', 'item-name', item?.name ?? ''));
      const move = (to: number): void => {
        const next = [...list];
        next.splice(i, 1);
        next.splice(to, 0, id);
        commit(next);
      };
      const up = keyed(button('↑', 'icon-small', () => move(i - 1), `Subir ${name}`), `up:${id}`);
      const down = keyed(button('↓', 'icon-small', () => move(i + 1), `Bajar ${name}`), `down:${id}`);
      const remove = keyed(button('×', 'icon-small', () => commit(list.filter((x) => x !== id)), `Quitar ${name}`), `remove:${id}`);
      up.disabled = i === 0;
      down.disabled = i === list.length - 1;
      remove.disabled = list.length <= WHEEL_LIMITS.min;
      li.append(text, up, down, remove);
      ol.append(li);
    });

    const groups = new Map<string, WheelItem[]>();
    for (const item of catalog) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
    const catalogEl = el('div', 'catalog');
    for (const [group, items] of groups) {
      const fieldset = el('fieldset', 'catalog-group');
      fieldset.append(el('legend', '', group));
      for (const item of items) {
        const label = el('label', 'catalog-item');
        const box = keyed(el('input'), `check:${item.id}`);
        box.type = 'checkbox';
        const checked = list.includes(item.id);
        box.checked = checked;
        box.disabled = checked ? list.length <= WHEEL_LIMITS.min : list.length >= WHEEL_LIMITS.max;
        box.addEventListener('change', () => commit(box.checked ? [...list, item.id] : list.filter((x) => x !== item.id)));
        label.title = item.name;
        label.append(box, el('span', 'item-label', item.label), el('span', 'item-name', item.name));
        fieldset.append(label);
      }
      catalogEl.append(fieldset);
    }

    const defaults = degrees ? DEFAULT_DEGREE_TYPES : DEFAULT_WHEEL_CHORDS;
    const reset = keyed(button('Restablecer esta rueda', 'secondary', () => commit(defaults)), 'reset');

    this.editor.replaceChildren(top, hint, ol, catalogEl, reset);
    if (focused) this.editor.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focused)}"]`)?.focus();
  }

  // -------------------------------------------------------------------------
  // Controles
  // -------------------------------------------------------------------------

  private section(title: string): void {
    this.body.append(el('h3', 'panel-section', title));
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
    this.body.append(row);
  }

  private select(label: string, options: Options, read: (s: Settings) => string, write: (value: string) => Patch): void {
    const select = el('select');
    let group: HTMLOptGroupElement | null = null;
    for (const [value, text, groupName] of options) {
      const option = el('option', '', text);
      option.value = value;
      if (groupName && group?.label !== groupName) {
        group = el('optgroup');
        group.label = groupName;
        select.append(group);
      }
      (groupName && group ? group : select).append(option);
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

  private segmented(
    label: string,
    options: Options,
    read: (s: Settings) => string,
    write: (value: string) => Patch,
  ): (readonly [string, HTMLButtonElement])[] {
    const group = el('div', 'segmented');
    group.setAttribute('role', 'radiogroup');
    const buttons = options.map(([value, text]) => {
      const b = button(text, '', () => this.onChange(write(value)));
      b.setAttribute('role', 'radio');
      group.append(b);
      return [value, b] as const;
    });
    this.syncers.push((s) => {
      for (const [value, b] of buttons) b.setAttribute('aria-checked', String(read(s) === value));
    });
    this.field(label, group);
    return buttons;
  }

  /** Muestras de color; el nombre del color elegido aparece junto a la etiqueta. */
  private swatches(
    label: string,
    colors: readonly WheelColor[],
    read: (s: Settings) => string,
    write: (value: string) => Patch,
  ): void {
    const group = el('div', 'swatches');
    group.setAttribute('role', 'radiogroup');
    const output = el('output', 'field-value');
    const buttons = colors.map((color) => {
      const b = button('', 'swatch', () => this.onChange(write(color.id)), color.name);
      b.setAttribute('role', 'radio');
      b.title = color.name;
      b.style.setProperty('--swatch', `rgb(${color.rgb.join(', ')})`);
      group.append(b);
      return [color, b] as const;
    });
    this.syncers.push((s) => {
      const selected = read(s);
      for (const [color, b] of buttons) {
        b.setAttribute('aria-checked', String(color.id === selected));
        if (color.id === selected) output.textContent = color.name;
      }
    });
    this.field(label, group, output);
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
