// Control characters except TAB. Includes ESC (ANSI injection), CR/LF (log forging).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000A-\u001F\u007F-\u009F]/g

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength
    ? `${text.slice(0, maxLength)}…[truncated]`
    : text
}

/** Escapes control characters so one log call can never forge extra log lines. */
export function escapeControlChars(input: string): string {
  return input.replace(CONTROL_CHARS, (ch) => {
    if (ch === '\n') return '\\n'
    if (ch === '\r') return '\\r'
    return `\\x${ch.charCodeAt(0).toString(16).padStart(2, '0')}`
  })
}

export function sanitizeText(input: string, maxLength: number): string {
  return escapeControlChars(truncate(input, maxLength))
}

export function normalizeScope(
  scope: unknown,
  maxLength = 64
): string | undefined {
  if (scope === undefined) return undefined
  if (typeof scope !== 'string')
    throw new TypeError('Logger scope must be a string.')
  const clean = escapeControlChars(scope.trim())
  if (clean.length === 0) throw new TypeError('Logger scope must not be empty.')
  return truncate(clean, maxLength)
}

export function joinScope(
  parent: string | undefined,
  child: string | undefined
): string | undefined {
  if (parent && child) return `${parent}:${child}`
  return parent ?? child
}

// ───────────────────────── timestamps ─────────────────────────

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
export function formatTimestamp(
  date: Date,
  options: TimestampOptions = {}
): string {
  if (Number.isNaN(date.getTime())) return 'Invalid Date'
  const {
    timezone = 'local',
    hourCycle = 12,
    date: showDate = true,
    milliseconds = true,
    format = 'standard',
  } = options
  if (format === 'iso') return date.toISOString()

  const utc = timezone === 'utc'
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0')
  const year = utc ? date.getUTCFullYear() : date.getFullYear()
  const month = (utc ? date.getUTCMonth() : date.getMonth()) + 1
  const day = utc ? date.getUTCDate() : date.getDate()
  const hours24 = utc ? date.getUTCHours() : date.getHours()
  const minutes = utc ? date.getUTCMinutes() : date.getMinutes()
  const seconds = utc ? date.getUTCSeconds() : date.getSeconds()
  const ms = utc ? date.getUTCMilliseconds() : date.getMilliseconds()

  const hours = hourCycle === 12 ? hours24 % 12 || 12 : hours24
  const meridiem = hourCycle === 12 ? (hours24 >= 12 ? ' PM' : ' AM') : ''
  const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${milliseconds ? `.${pad(ms, 3)}` : ''}${meridiem}`
  const text = showDate
    ? `${pad(year, 4)}-${pad(month)}-${pad(day)} ${time}`
    : time
  return utc ? `${text} UTC` : text
}

const TIMESTAMP_KEYS = new Set([
  'timezone',
  'hourCycle',
  'date',
  'milliseconds',
  'format',
])

/**
 * Validates a timestamp setting once and returns the formatter function
 * (or `null` when timestamps are disabled). Throws `TypeError` on invalid input.
 */
export function resolveTimestamp(
  input: boolean | TimestampOptions | TimestampFn | undefined
): TimestampFn | null {
  if (input === undefined || input === true) return (d) => formatTimestamp(d)
  if (input === false) return null
  if (typeof input === 'function') return input
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(
      '"timestamp" must be a boolean, an options object or a function.'
    )
  }

  for (const key of Object.keys(input)) {
    if (!TIMESTAMP_KEYS.has(key)) {
      throw new TypeError(
        `Unknown timestamp option "${key}". Allowed: ${[...TIMESTAMP_KEYS].join(', ')}.`
      )
    }
  }
  const { timezone, hourCycle, date, milliseconds, format } = input
  if (timezone !== undefined && timezone !== 'local' && timezone !== 'utc') {
    throw new TypeError('timestamp.timezone must be "local" or "utc".')
  }
  if (hourCycle !== undefined && hourCycle !== 12 && hourCycle !== 24) {
    throw new TypeError('timestamp.hourCycle must be 12 or 24.')
  }
  if (date !== undefined && typeof date !== 'boolean')
    throw new TypeError('timestamp.date must be a boolean.')
  if (milliseconds !== undefined && typeof milliseconds !== 'boolean') {
    throw new TypeError('timestamp.milliseconds must be a boolean.')
  }
  if (format !== undefined && format !== 'standard' && format !== 'iso') {
    throw new TypeError('timestamp.format must be "standard" or "iso".')
  }

  const frozen: TimestampOptions = Object.freeze({ ...input })
  return (d) => formatTimestamp(d, frozen)
}
