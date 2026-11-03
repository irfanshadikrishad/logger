export declare const REDACTED = '[REDACTED]'
/** Keys masked by default. Matching ignores case, `_`, `-` and other separators. */
export declare const DEFAULT_REDACT_KEYS: readonly string[]
export type Redactor = (key: string) => boolean
export declare function createRedactor(extraKeys?: readonly string[]): Redactor
//# sourceMappingURL=redact.d.ts.map
