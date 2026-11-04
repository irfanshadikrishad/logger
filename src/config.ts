import { loadConfigFile, type FileConfig } from '@/configFile.js'
import type { Formatter } from '@/formatters/Formatter.js'
import { PrettyFormatter } from '@/formatters/PrettyFormatter.js'
import { LEVEL_NAMES, parseLevel, type LevelThreshold } from '@/levels.js'
import { ConsoleTransport } from '@/transports/ConsoleTransport.js'
import type { Transport } from '@/transports/Transport.js'
import { createRedactor } from '@/utils/redact.js'
import type { NormalizeOptions } from '@/utils/serialize.js'

export interface LoggerOptions {
  /** Minimum level to output. Default: `LOG_LEVEL` env var, else config file, else `INFO`. `SILENT` disables output. */
  level?: LevelThreshold
  /** Label added to every line, e.g. `auth` -> `[auth]`. */
  scope?: string
  /** Default: `PrettyFormatter` (configured by the config file, if any). */
  formatter?: Formatter
  /** Default: `[new ConsoleTransport()]`. */
  transports?: Transport[]
  /** Extra metadata keys to mask, on top of the built-in list and the config file. */
  redact?: string[]
  /** Escape control characters (newlines, ANSI) in messages. Default: `true`. */
  sanitize?: boolean
  /** Max nesting depth of metadata. Default: 6. */
  maxDepth?: number
  /** Max array items / object keys kept per level. Default: 100. */
  maxItems?: number
  /** Max length of any string. Default: 10 000. */
  maxStringLength?: number
  /**
   * `logger.config.*` handling. Default: search upward from the working directory.
   * `false`: ignore config files. `string`: explicit path (relative to the working directory).
   */
  configFile?: boolean | string
}

/** State shared between a logger and all of its children. */
export interface LoggerCore {
  level: LevelThreshold
  readonly formatter: Formatter
  readonly transports: readonly Transport[]
  readonly sanitize: boolean
  readonly normalize: NormalizeOptions
  failureReported: boolean
}

export const DEFAULTS = {
  level: 'INFO',
  maxDepth: 6,
  maxItems: 100,
  maxStringLength: 10_000,
} as const

function positiveInt(
  name: string,
  value: number | undefined,
  fallback: number
): number {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`Logger option "${name}" must be a positive integer.`)
  }
  return value
}

/**
 * Precedence (highest first): explicit options > `LOG_LEVEL` env (level only) > config file > defaults.
 */
export function resolveCore(
  options: LoggerOptions,
  env: NodeJS.ProcessEnv = process.env
): LoggerCore {
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('Logger options must be an object.')
  }

  const file: FileConfig =
    options.configFile === false
      ? {}
      : loadConfigFile(
          typeof options.configFile === 'string'
            ? options.configFile
            : undefined
        )

  let level: LevelThreshold
  if (options.level !== undefined) {
    const parsed = parseLevel(options.level)
    if (!parsed) {
      throw new TypeError(
        `Invalid log level "${String(options.level)}". Expected one of: ${[...LEVEL_NAMES, 'SILENT'].join(', ')}.`
      )
    }
    level = parsed
  } else {
    // A bad env value must not crash the app: ignore it.
    level = parseLevel(env['LOG_LEVEL']) ?? file.level ?? DEFAULTS.level
  }

  const formatter =
    options.formatter ??
    new PrettyFormatter({
      colors: file.colors,
      timestamp: file.timestamp,
      levelStyle: file.levelStyle,
      styles: file.styles,
    })
  if (typeof formatter.format !== 'function')
    throw new TypeError('Logger "formatter" must implement format().')

  const transports = options.transports ?? [new ConsoleTransport()]
  if (
    !Array.isArray(transports) ||
    transports.some((t) => typeof t?.write !== 'function')
  ) {
    throw new TypeError(
      'Logger "transports" must be an array of objects implementing write().'
    )
  }

  const redact = options.redact ?? []
  if (!Array.isArray(redact) || redact.some((k) => typeof k !== 'string')) {
    throw new TypeError('Logger "redact" must be an array of strings.')
  }

  return {
    level,
    formatter,
    transports: Object.freeze([...transports]),
    sanitize: options.sanitize ?? file.sanitize ?? true,
    normalize: {
      maxDepth: positiveInt(
        'maxDepth',
        options.maxDepth ?? file.maxDepth,
        DEFAULTS.maxDepth
      ),
      maxItems: positiveInt(
        'maxItems',
        options.maxItems ?? file.maxItems,
        DEFAULTS.maxItems
      ),
      maxStringLength: positiveInt(
        'maxStringLength',
        options.maxStringLength ?? file.maxStringLength,
        DEFAULTS.maxStringLength
      ),
      isSensitiveKey: createRedactor([...(file.redact ?? []), ...redact]),
    },
    failureReported: false,
  }
}
