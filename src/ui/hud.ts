/** Elementos DOM superpuestos: acorde, estado, medidor y avisos. */

export type StatusTone = 'loading' | 'ok' | 'idle' | 'error';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id}`);
  return el as T;
}

export class Hud {
  private readonly chord = byId('chord');
  private readonly chordName = byId('chord-name');
  private readonly chordNotes = byId('chord-notes');
  private readonly status = byId('status');
  private readonly statusText = byId('status-text');
  private readonly meterFill = byId('meter-fill');
  private readonly meterMarker = byId('meter-marker');
  private readonly toast = byId('toast');
  private toastTimer = 0;
  private lastStatus = '';
  private lastMeter = -1;
  private lastMarker: number | null = -1;
  private silent = false;

  setChord(name: string, notes: string): void {
    if (this.chordName.textContent !== name) this.chordName.textContent = name;
    if (this.chordNotes.textContent !== notes) this.chordNotes.textContent = notes;
    this.chord.classList.remove('is-hint');
  }

  /** Atenúa el acorde cuando no suena (OFF, sin mano o volumen a cero). */
  setSilent(silent: boolean): void {
    if (silent === this.silent) return;
    this.silent = silent;
    this.chord.classList.toggle('is-silent', silent);
  }

  /** Texto de ayuda en lugar del acorde (antes del primer acorde). */
  setHint(text: string): void {
    this.chordName.textContent = '';
    this.chordNotes.textContent = text;
    this.chord.classList.add('is-hint');
  }

  setStatus(text: string, tone: StatusTone): void {
    const key = `${tone}|${text}`;
    if (key === this.lastStatus) return;
    this.lastStatus = key;
    this.statusText.textContent = text;
    this.status.dataset.tone = tone;
  }

  /**
   * @param level nivel de salida 0..1.
   * @param target volumen que pide la mano 0..1, o null si no hay mano.
   */
  setMeter(level: number, target: number | null): void {
    const l = Math.round(level * 100) / 100;
    if (l !== this.lastMeter) {
      this.lastMeter = l;
      this.meterFill.style.setProperty('--level', String(l));
    }
    const m = target === null ? null : Math.round(target * 100) / 100;
    if (m !== this.lastMarker) {
      this.lastMarker = m;
      this.meterMarker.hidden = m === null;
      if (m !== null) this.meterMarker.style.bottom = `${m * 100}%`;
    }
  }

  showToast(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.add('is-visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('is-visible'), 1600);
  }
}
