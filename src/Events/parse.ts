/**
 * Strict accessors used when mapping event frames. A malformed frame throws
 * a descriptive error, which the stream reports through `onError` instead of
 * delivering a half-built event.
 * @internal
 */

import type { RawFrame } from './EventStream';

export function asObject(value: unknown, what: string): RawFrame {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Malformed event: expected an object for ${what}`);
  }
  return value as RawFrame;
}

export function asArray(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Malformed event: expected an array for ${what}`);
  return value;
}

export function num(value: unknown, what: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  throw new Error(`Malformed event: expected a number for ${what}`);
}

export function numOrNull(value: unknown, what: string): number | null {
  return value == null ? null : num(value, what);
}

export function str(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new Error(`Malformed event: expected a string for ${what}`);
  return value;
}

export function strOrNull(value: unknown, what: string): string | null {
  return value == null ? null : str(value, what);
}

/** Parses an integer given as a decimal string or a JSON number. */
export function big(value: unknown, what: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  throw new Error(`Malformed event: expected an integer for ${what}`);
}

export function bigOrNull(value: unknown, what: string): bigint | null {
  return value == null ? null : big(value, what);
}
