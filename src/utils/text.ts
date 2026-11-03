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

/** Local time, 12-hour clock: `2026-11-03 10:15:30.123 AM`. */
export function formatTimestamp(date: Date): string {
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0')
  const hours24 = date.getHours()
  const hours12 = hours24 % 12 || 12
  const meridiem = hours24 >= 12 ? 'PM' : 'AM'
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(hours12)}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)} ${meridiem}`
  )
}
