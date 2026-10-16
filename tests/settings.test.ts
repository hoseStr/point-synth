import { describe, expect, it } from 'vitest';
import { WHEEL_COLORS, WHEEL_COLOR_IDS } from '../src/config';
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

describe('colores de las ruedas', () => {
  it('hay 6 colores distintos para elegir', () => {
    expect(WHEEL_COLORS).toHaveLength(6);
    expect(new Set(WHEEL_COLOR_IDS).size).toBe(6);
    expect(new Set(WHEEL_COLORS.map((c) => c.rgb.join())).size).toBe(6);
  });

  it('por defecto: grafito para las notas y azul pizarra para los acordes', () => {
    expect(DEFAULT_SETTINGS.rootWheelColor).toBe('graphite');
    expect(DEFAULT_SETTINGS.qualityWheelColor).toBe('slate');
  });

  it('cada rueda guarda su color y se descartan colores desconocidos', () => {
    const s = sanitizeSettings({ rootWheelColor: 'wine', qualityWheelColor: 'emerald' });
    expect(s.rootWheelColor).toBe('wine');
    expect(s.qualityWheelColor).toBe('emerald');
    const bad = sanitizeSettings({ rootWheelColor: 'fucsia', qualityWheelColor: 3 });
    expect(bad.rootWheelColor).toBe(DEFAULT_SETTINGS.rootWheelColor);
    expect(bad.qualityWheelColor).toBe(DEFAULT_SETTINGS.qualityWheelColor);
  });

  it('el texto blanco se lee sobre todos los colores (contraste ≥ 4.5 a opacidad máxima)', () => {
    const luminance = ([r, g, b]: readonly number[]): number => {
      const lin = (c: number): number => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
    };
    for (const c of WHEEL_COLORS) {
      expect(1.05 / (luminance(c.rgb) + 0.05), c.name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
