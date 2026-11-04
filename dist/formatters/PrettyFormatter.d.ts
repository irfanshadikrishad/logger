import { type ChalkInstance } from 'chalk'
import { type LogLevel } from '../levels.js'
import type { LogRecord } from '../types.js'
import { type TimestampFn, type TimestampOptions } from '../utils/text.js'
import type { Formatter } from './Formatter.js'
/**
 * `text`:   coloured text; only FATAL is a badge (default).
 * `badge`:  every level is a bold block on a coloured background.
 * `hybrid`: text for DEBUG/INFO/SUCCESS, badges for WARN/ERROR/FATAL.
 */
export type LevelStyle = 'text' | 'badge' | 'hybrid'
/** Receives the (colour-level aware) chalk instance and returns the style for one level. */
export type LevelStyleFn = (chalk: ChalkInstance) => ChalkInstance
export interface PrettyFormatterOptions {
  /**
   * `undefined` (default): auto-detect (TTY, FORCE_COLOR, NO_COLOR).
   * `true`: force colours on. `false`: never colour.
   */
  colors?: boolean
  /**
   * `true` (default): local time, 12-hour. `false`: hidden.
   * Object: `{ timezone, hourCycle, date, milliseconds, format }`. Function: fully custom.
   */
  timestamp?: boolean | TimestampOptions | TimestampFn
  /** Preset for all levels. Default: `text`. */
  levelStyle?: LevelStyle
  /** Per-level overrides on top of the preset, e.g. `{ INFO: (c) => c.blue }`. */
  styles?: Partial<Record<LogLevel, LevelStyleFn>>
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
