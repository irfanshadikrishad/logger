import type { LevelStyle, LevelStyleFn } from '@/formatters/PrettyFormatter.js'
import {
  LEVEL_NAMES,
  parseLevel,
  type LevelThreshold,
  type LogLevel,
} from '@/levels.js'
import {
  resolveTimestamp,
  type TimestampFn,
  type TimestampOptions,
} from '@/utils/text.js'
import { readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

/** Looked up in this order; the first match in a directory wins. */
export const CONFIG_FILE_NAMES = [
  'logger.config.json',
  'logger.config.cjs',
  'logger.config.js',
  'logger.config.mjs',
] as const

const MAX_CONFIG_BYTES = 1_000_000

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

const BADGE_TO_STYLE: Record<string, LevelStyle> = {
  ALL: 'badge',
  DEFAULT: 'text',
  HYBRID: 'hybrid',
}
const ALLOWED_KEYS = new Set([
  'level',
  'badge',
  'timestamp',
  'colors',
  'redact',
  'sanitize',
  'maxDepth',
  'maxItems',
  'maxStringLength',
  'styles',
])

const cache = new Map<string, FileConfig>()

/** Test helper: forget cached lookups. */
export function clearConfigFileCache(): void {
  cache.clear()
}

function isFile(candidate: string): boolean {
  try {
    return statSync(candidate).isFile()
  } catch {
    return false
  }
}

/**
 * Searches `startDir` and its parents for a config file, stopping at the first
 * directory that contains a `package.json` (the project root) or the filesystem root.
 */
export function findConfigFile(startDir: string): string | undefined {
  let dir = path.resolve(startDir)
  for (;;) {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = path.join(dir, name)
      if (isFile(candidate)) return candidate
    }
    if (isFile(path.join(dir, 'package.json'))) return undefined
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

/**
 * Loads and validates the config file (cached). Returns `{}` when none exists.
 * With `explicitPath`, the file must exist. Throws `TypeError` when the file is invalid.
 */
export function loadConfigFile(explicitPath?: string): FileConfig {
  const cwd = process.cwd()
  const key =
    explicitPath !== undefined
      ? path.resolve(cwd, explicitPath)
      : `search:${cwd}`
  const cached = cache.get(key)
  if (cached) return cached

  let file: string | undefined
  if (explicitPath !== undefined) {
    file = path.resolve(cwd, explicitPath)
    if (!isFile(file))
      throw new TypeError(`Logger config file not found: "${file}".`)
  } else {
    file = findConfigFile(cwd)
  }

  const result = file === undefined ? {} : parseConfigFile(file)
  cache.set(key, result)
  return result
}

function readRaw(file: string): unknown {
  if (statSync(file).size > MAX_CONFIG_BYTES)
    throw new Error('file is larger than 1 MB')
  if (file.endsWith('.json'))
    return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))

  // Synchronous load: CJS everywhere, ESM via require(esm) (Node >= 20.19 / 22.12, no top-level await).
  const mod: unknown = createRequire(import.meta.url)(file)
  return typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default: unknown }).default
    : mod
}

function parseConfigFile(file: string): FileConfig {
  let raw: unknown
  try {
    raw = readRaw(file)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new TypeError(`Failed to load logger config "${file}": ${reason}`)
  }
  return validate(raw, file)
}

function validate(raw: unknown, file: string): FileConfig {
  const fail: (message: string) => never = (message) => {
    throw new TypeError(`Invalid logger config "${file}": ${message}`)
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    fail('expected an object.')
  const input = raw as Record<string, unknown>

  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key))
      fail(`unknown key "${key}". Allowed: ${[...ALLOWED_KEYS].join(', ')}.`)
  }

  const out: FileConfig = {}

  if (input['level'] !== undefined) {
    const level = parseLevel(input['level'])
    if (!level)
      fail(`"level" must be one of ${[...LEVEL_NAMES, 'SILENT'].join(', ')}.`)
    out.level = level
  }

  if (input['badge'] !== undefined) {
    const badge =
      typeof input['badge'] === 'string'
        ? input['badge'].trim().toUpperCase()
        : ''
    if (!Object.hasOwn(BADGE_TO_STYLE, badge))
      fail('"badge" must be "ALL", "DEFAULT" or "HYBRID".')
    out.levelStyle = BADGE_TO_STYLE[badge] as LevelStyle
  }

  if (input['timestamp'] !== undefined) {
    try {
      resolveTimestamp(
        input['timestamp'] as boolean | TimestampOptions | TimestampFn
      ) // validation only
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
    out.timestamp = input['timestamp'] as
      boolean | TimestampOptions | TimestampFn
  }

  for (const key of ['colors', 'sanitize'] as const) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'boolean') fail(`"${key}" must be a boolean.`)
      out[key] = input[key] as boolean
    }
  }

  if (input['redact'] !== undefined) {
    const redact = input['redact']
    if (!Array.isArray(redact) || redact.some((k) => typeof k !== 'string'))
      fail('"redact" must be an array of strings.')
    out.redact = redact as string[]
  }

  for (const key of ['maxDepth', 'maxItems', 'maxStringLength'] as const) {
    if (input[key] !== undefined) {
      const value = input[key]
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1)
        fail(`"${key}" must be a positive integer.`)
      out[key] = value as number
    }
  }

  if (input['styles'] !== undefined) {
    const styles = input['styles']
    if (typeof styles !== 'object' || styles === null || Array.isArray(styles))
      fail('"styles" must be an object.')
    for (const [level, fn] of Object.entries(
      styles as Record<string, unknown>
    )) {
      if (!(LEVEL_NAMES as readonly string[]).includes(level))
        fail(`styles.${level} is not a level.`)
      if (typeof fn !== 'function')
        fail(`styles.${level} must be a function (JS config files only).`)
    }
    out.styles = styles as Partial<Record<LogLevel, LevelStyleFn>>
  }

  return out
}
