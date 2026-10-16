/** Generadores puros de formas de onda y ruido (testeables sin Web Audio). */

/** PRNG determinista (mulberry32): mismo resultado en cada carga. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Coeficientes de Fourier de una onda de pulso de ancho `width` (0..1): vale +1
 * durante esa fracción del ciclo y -1 el resto. Con 0.5 es una onda cuadrada
 * (solo armónicos impares); más estrecha suena más nasal (Juno, chiptune).
 * Se pasan a createPeriodicWave, que la sintetiza sin aliasing.
 */
export function pulseCoefficients(
  width: number,
  harmonics = 96,
): { real: Float32Array<ArrayBuffer>; imag: Float32Array<ArrayBuffer> } {
  const w = Math.min(0.99, Math.max(0.01, width));
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n++) {
    const phase = 2 * Math.PI * n * w;
    real[n] = (2 * Math.sin(phase)) / (Math.PI * n);
    imag[n] = (2 * (1 - Math.cos(phase))) / (Math.PI * n);
  }
  return { real, imag };
}

export type NoiseColor = 'white' | 'pink';

/**
 * Ruido blanco o rosa (−3 dB por octava, filtro de Paul Kellet), en [-1, 1].
 * El rosa suena más natural para soplidos y aire.
 */
export function generateNoise(length: number, color: NoiseColor, seed = 0x51ce): Float32Array<ArrayBuffer> {
  const rand = mulberry32(seed);
  const out = new Float32Array(length);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = rand() * 2 - 1;
    if (color === 'white') {
      out[i] = white;
      continue;
    }
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    out[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11));
    b6 = white * 0.115926;
  }
  return out;
}

/** Curva de saturación suave (tanh) para un WaveShaperNode. `amount` 0..1. */
export function driveCurve(amount: number, size = 2048): Float32Array<ArrayBuffer> {
  const k = 1 + Math.max(0, amount) * 9;
  const norm = Math.tanh(k);
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}
