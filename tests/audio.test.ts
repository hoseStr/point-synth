import { describe, expect, it } from 'vitest';
import { PRESETS, PRESET_IDS, isPresetId } from '../src/audio/presets';
import { driveCurve, generateNoise, pulseCoefficients } from '../src/audio/waves';

describe('onda de pulso', () => {
  it('al 50 % es cuadrada: solo armónicos impares', () => {
    const { real, imag } = pulseCoefficients(0.5, 16);
    for (let n = 1; n <= 16; n++) {
      expect(Math.abs(real[n]!)).toBeLessThan(1e-6);
      if (n % 2 === 0) expect(Math.abs(imag[n]!)).toBeLessThan(1e-6);
      else expect(imag[n]!).toBeCloseTo(4 / (Math.PI * n), 5);
    }
    expect(real[0]).toBe(0);
    expect(imag[0]).toBe(0);
  });

  it('un pulso estrecho tiene armónicos pares (suena más nasal)', () => {
    const { real, imag } = pulseCoefficients(0.25, 4);
    expect(Math.hypot(real[2]!, imag[2]!)).toBeGreaterThan(0.1);
  });
});

describe('ruido', () => {
  it('acotado y determinista', () => {
    for (const color of ['white', 'pink'] as const) {
      const a = generateNoise(48000, color);
      const b = generateNoise(48000, color);
      expect(a).toEqual(b);
      for (const v of a) expect(Math.abs(v)).toBeLessThanOrEqual(1);
    }
  });

  it('el rosa tiene menos agudos que el blanco', () => {
    const roughness = (x: Float32Array): number => {
      let d = 0;
      for (let i = 1; i < x.length; i++) d += Math.abs(x[i]! - x[i - 1]!);
      let a = 0;
      for (const v of x) a += Math.abs(v);
      return d / a;
    };
    expect(roughness(generateNoise(48000, 'pink'))).toBeLessThan(roughness(generateNoise(48000, 'white')) / 2);
  });
});

describe('saturación', () => {
  it('curva monótona que va de -1 a 1', () => {
    const c = driveCurve(0.5, 256);
    expect(c[0]).toBeCloseTo(-1);
    expect(c[255]).toBeCloseTo(1);
    for (let i = 1; i < c.length; i++) expect(c[i]!).toBeGreaterThan(c[i - 1]!);
  });
});

describe('presets', () => {
  it('17 presets, cada uno con su definición', () => {
    expect(PRESET_IDS).toHaveLength(17);
    expect(new Set(PRESET_IDS).size).toBe(17);
    for (const id of PRESET_IDS) {
      expect(isPresetId(id)).toBe(true);
      expect(PRESETS[id].id).toBe(id);
    }
  });

  it('valores razonables', () => {
    const groups = new Set(['Clásicos', 'Pads modernos', 'Ataque y carácter', 'Teclas y campanas FM', 'Texturas ambient']);
    for (const id of PRESET_IDS) {
      const p = PRESETS[id];
      expect(groups.has(p.group), id).toBe(true);
      expect(p.description.length, id).toBeGreaterThan(10);
      expect(p.oscillators.length, id).toBeGreaterThan(0);
      expect(p.oscillators.length, id).toBeLessThanOrEqual(8);
      for (const o of p.oscillators) {
        expect(o.ratio, id).toBeGreaterThan(0);
        if (o.pulseWidth !== undefined) expect(o.pulseWidth > 0 && o.pulseWidth < 1, id).toBe(true);
        if (o.pan !== undefined) expect(Math.abs(o.pan), id).toBeLessThanOrEqual(1);
      }
      for (const env of [p.amp, p.filter.env]) {
        expect(env.attack, id).toBeGreaterThan(0);
        expect(env.decay, id).toBeGreaterThan(0);
        expect(env.release, id).toBeGreaterThan(0);
        expect(env.sustain >= 0 && env.sustain <= 1, id).toBe(true);
      }
      expect(p.level > 0 && p.level <= 1.5, id).toBe(true);
      expect(p.bassLevel > 0 && p.bassLevel <= 1.5, id).toBe(true);
      if (p.chorus !== undefined) expect(p.chorus >= 0 && p.chorus <= 1, id).toBe(true);
      if (p.drive !== undefined) expect(p.drive >= 0 && p.drive <= 1, id).toBe(true);
    }
  });

  it('las cuatro familias nuevas tienen tres sonidos cada una', () => {
    for (const group of ['Pads modernos', 'Ataque y carácter', 'Teclas y campanas FM', 'Texturas ambient']) {
      expect(PRESET_IDS.filter((id) => PRESETS[id].group === group), group).toHaveLength(3);
    }
  });
});
