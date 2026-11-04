import type { LogRecord } from '../types.js'
import type { Formatter } from './Formatter.js'
export interface PrettyFormatterOptions {
  /**
   * `undefined` (default): auto-detect (TTY, FORCE_COLOR, NO_COLOR).
   * `true`: force colours on. `false`: never colour.
   */
  colors?: boolean
  /** `true` (default) uses the standard local 12-hour format; `false` hides it; or pass your own. */
  timestamp?: boolean | ((date: Date) => string)
}
/**
 * Standard human-readable format:
 *   2026-11-03 10:15:30.123 AM  WARN     [auth]  Login failed  {"userId":42}
 */
export declare class PrettyFormatter implements Formatter {
  #private
  constructor(options?: PrettyFormatterOptions)
  format(record: LogRecord): string
}
//# sourceMappingURL=PrettyFormatter.d.ts.map
