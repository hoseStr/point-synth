/**
 * Respuesta al impulso de reverb generada por código (sin archivos externos):
 * ruido estéreo con caída exponencial que se oscurece con el tiempo.
 */

import { mulberry32 } from './waves';

export interface ImpulseOptions {
  readonly seconds?: number;
  /** Exponente de la caída: más alto = cola más corta. */
  readonly decay?: number;
  readonly preDelay?: number;
}

export function generateImpulse(
  sampleRate: number,
  opts: ImpulseOptions = {},
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const seconds = opts.seconds ?? 2.8;
  const decay = opts.decay ?? 3.2;
  const preDelay = Math.round((opts.preDelay ?? 0.012) * sampleRate);
  const length = Math.max(1, Math.round(seconds * sampleRate));
  const fadeIn = Math.round(0.004 * sampleRate);
  const channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [new Float32Array(length), new Float32Array(length)];

  channels.forEach((data, ch) => {
    const rand = mulberry32(0x5eed + ch * 7919);
    let lp = 0;
    for (let i = preDelay; i < length; i++) {
      const t = i / length;
      // El filtro pasa-bajos se cierra con el tiempo: cola más oscura que el inicio.
      const brightness = 0.85 - 0.7 * t;
      lp += brightness * (rand() * 2 - 1 - lp);
      const envelope = Math.pow(1 - t, decay);
      const ramp = Math.min(1, (i - preDelay) / fadeIn);
      data[i] = lp * envelope * ramp;
    }
  });
  return channels;
}
