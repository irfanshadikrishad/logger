import type { LevelStyle, LevelStyleFn } from './formatters/PrettyFormatter.js'
import { type LevelThreshold, type LogLevel } from './levels.js'
import { type TimestampFn, type TimestampOptions } from './utils/text.js'
/** Looked up in this order; the first match in a directory wins. */
export declare const CONFIG_FILE_NAMES: readonly [
  'logger.config.json',
  'logger.config.cjs',
  'logger.config.js',
  'logger.config.mjs',
]
/**
 * Shape of `logger.config.json` / `.cjs` / `.js` / `.mjs`.
 * In a JS config, type it with the JSDoc tag `@type {import('@irfanshadikrishad/logger').LoggerConfigFile}`.
 */
export interface LoggerConfigFile {
  /** Minimum level. `LOG_LEVEL` env var overrides it. */
  level?: LevelThreshold
  /** `DEFAULT`: coloured text, badge on FATAL only. `ALL`: badge on every level. `HYBRID`: badges on WARN/ERROR/FATAL. */
  badge?: 'ALL' | 'DEFAULT' | 'HYBRID'
  /** `false` hides it; or `{ timezone, hourCycle, date, milliseconds, format }`. */
  timestamp?: boolean | TimestampOptions
  /** `true` force colours, `false` disable, omit for auto-detect. */
  colors?: boolean
  /** Extra metadata keys to mask. */
  redact?: string[]
  sanitize?: boolean
  maxDepth?: number
  maxItems?: number
  maxStringLength?: number
  /** Per-level style overrides. JS config files only (functions cannot be written in JSON). */
  styles?: Partial<Record<LogLevel, LevelStyleFn>>
}
/** Validated, normalised config used internally. */
export interface FileConfig {
  level?: LevelThreshold
  levelStyle?: LevelStyle
  timestamp?: boolean | TimestampOptions | TimestampFn
  colors?: boolean
  redact?: string[]
  sanitize?: boolean
  maxDepth?: number
  maxItems?: number
  maxStringLength?: number
  styles?: Partial<Record<LogLevel, LevelStyleFn>>
}
/** Test helper: forget cached lookups. */
export declare function clearConfigFileCache(): void
/**
 * Searches `startDir` and its parents for a config file, stopping at the first
 * directory that contains a `package.json` (the project root) or the filesystem root.
 */
export declare function findConfigFile(startDir: string): string | undefined
/**
 * Loads and validates the config file (cached). Returns `{}` when none exists.
 * With `explicitPath`, the file must exist. Throws `TypeError` when the file is invalid.
 */
export declare function loadConfigFile(explicitPath?: string): FileConfig
//# sourceMappingURL=configFile.d.ts.map
