import { type Redactor } from './redact.js'
export interface NormalizeOptions {
  readonly maxDepth: number
  readonly maxItems: number
  readonly maxStringLength: number
  readonly isSensitiveKey: Redactor
}
export interface SerializedError {
  name: string
  message: string
  stack?: string
  cause?: unknown
  [key: string]: unknown
}
/**
 * Converts any value into a JSON-safe structure:
 * circular refs, BigInt, Symbol, functions, Error, Date, Map, Set, binary data,
 * throwing getters, depth/size limits and key redaction are all handled.
 * Never throws.
 */
export declare function normalize(
  value: unknown,
  options: NormalizeOptions
): unknown
export declare function serializeError(
  error: Error,
  options: NormalizeOptions
): SerializedError
/** `JSON.stringify` that cannot throw. */
export declare function stringify(value: unknown): string
//# sourceMappingURL=serialize.d.ts.map
