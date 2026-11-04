export declare function truncate(text: string, maxLength: number): string
/** Escapes control characters so one log call can never forge extra log lines. */
export declare function escapeControlChars(input: string): string
export declare function sanitizeText(input: string, maxLength: number): string
export declare function normalizeScope(
  scope: unknown,
  maxLength?: number
): string | undefined
export declare function joinScope(
  parent: string | undefined,
  child: string | undefined
): string | undefined
export interface TimestampOptions {
  /** `local` (default) or `utc`. UTC output gets a ` UTC` suffix. */
  timezone?: 'local' | 'utc'
  /** `12` (default, with AM/PM) or `24`. */
  hourCycle?: 12 | 24
  /** Include the date. Default: `true`. */
  date?: boolean
  /** Include milliseconds. Default: `true`. */
  milliseconds?: boolean
  /** `standard` (default) or `iso` (`2026-11-04T10:15:30.123Z`; always UTC, other options ignored). */
  format?: 'standard' | 'iso'
}
export type TimestampFn = (date: Date) => string
/** Default: local time, 12-hour clock: `2026-11-03 10:15:30.123 AM`. */
export declare function formatTimestamp(
  date: Date,
  options?: TimestampOptions
): string
/**
 * Validates a timestamp setting once and returns the formatter function
 * (or `null` when timestamps are disabled). Throws `TypeError` on invalid input.
 */
export declare function resolveTimestamp(
  input: boolean | TimestampOptions | TimestampFn | undefined
): TimestampFn | null
//# sourceMappingURL=text.d.ts.map
