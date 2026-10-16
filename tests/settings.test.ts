import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, migrateLegacySettings, sanitizeSettings } from '../src/ui/settings';

describe('sanitizeSettings', () => {
  it('sin datos devuelve los valores por defecto', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('basura')).toEqual(DEFAULT_SETTINGS);
  });

  it('conserva los valores válidos', () => {
    const s = sanitizeSettings({ preset: 'organ', baseOctave: 3, mirror: false, scaleTonic: 7, scaleMode: 'minor' });
    expect(s.preset).toBe('organ');
    expect(s.baseOctave).toBe(3);
    expect(s.mirror).toBe(false);
    expect(s.scaleTonic).toBe(7);
    expect(s.scaleMode).toBe('minor');
  });

  it('acota rangos y descarta valores inválidos', () => {
    const s = sanitizeSettings({
      preset: 'theremin',
      baseOctave: 9,
      reverb: -1,
      delay: 'mucho',
      wheelSize: 5,
      controlPoint: 'codo',
      scaleTonic: 12,
    });
    expect(s.preset).toBe(DEFAULT_SETTINGS.preset);
    expect(s.baseOctave).toBe(5);
    expect(s.reverb).toBe(0);
    expect(s.delay).toBe(DEFAULT_SETTINGS.delay);
    expect(s.wheelSize).toBeLessThanOrEqual(0.36);
    expect(s.controlPoint).toBe(DEFAULT_SETTINGS.controlPoint);
    expect(s.scaleTonic).toBeNull();
  });
});

describe('valores por defecto', () => {
  it('el cursor es la punta del índice y el volumen lo da el dedo', () => {
    expect(DEFAULT_SETTINGS.controlPoint).toBe('index');
    expect(DEFAULT_SETTINGS.volumeMode).toBe('finger');
  });
});

describe('migrateLegacySettings', () => {
  it('conserva sonido y apariencia, pero pasa el control al índice', () => {
    const s = migrateLegacySettings({ preset: 'strings', reverb: 0.6, controlPoint: 'palm', volumeMode: 'openness' });
    expect(s.preset).toBe('strings');
    expect(s.reverb).toBe(0.6);
    expect(s.controlPoint).toBe('index');
    expect(s.volumeMode).toBe('finger');
    expect(s.wheelSpread).toBe(DEFAULT_SETTINGS.wheelSpread);
  });
});
