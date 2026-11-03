import { Chalk } from 'chalk'
import { LEVEL_NAMES } from '../levels.js'
import { stringify } from '../utils/serialize.js'
import { formatTimestamp } from '../utils/text.js'
const LEVEL_PAD = Math.max(...LEVEL_NAMES.map((name) => name.length))
const MAX_CAUSE_DEPTH = 10
const INDENT = '    '
function resolveChalk(colors, env = process.env) {
  if (colors === false) return new Chalk({ level: 0 })
  if (colors === true) {
    const detected = new Chalk().level
    return new Chalk({ level: detected > 0 ? detected : 1 })
  }
  const noColor = env['NO_COLOR'] !== undefined && env['NO_COLOR'] !== ''
  const forced = env['FORCE_COLOR'] !== undefined && env['FORCE_COLOR'] !== ''
  return noColor && !forced ? new Chalk({ level: 0 }) : new Chalk()
}
function isErrorLike(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.name === 'string' &&
    typeof value.message === 'string'
  )
}
/**
 * Standard human-readable format:
 *   2026-11-03 10:15:30.123 AM  WARN     [auth]  Login failed  {"userId":42}
 */
export class PrettyFormatter {
  #chalk
  #styles
  #timestamp
  constructor(options = {}) {
    const c = (this.#chalk = resolveChalk(options.colors))
    this.#styles = {
      DEBUG: c.gray,
      INFO: c.cyan,
      SUCCESS: c.green,
      WARN: c.yellow,
      ERROR: c.bold.red,
      FATAL: c.bold.white.bgRed,
    }
    const ts = options.timestamp ?? true
    this.#timestamp = ts === false ? null : ts === true ? formatTimestamp : ts
  }
  format(record) {
    const c = this.#chalk
    const parts = []
    if (this.#timestamp) parts.push(c.dim(this.#timestamp(record.timestamp)))
    parts.push(this.#styles[record.level](record.level.padEnd(LEVEL_PAD)))
    if (record.scope) parts.push(c.magenta(`[${record.scope}]`))
    parts.push(
      record.level === 'DEBUG' ? c.gray(record.message) : record.message
    )
    if (record.meta !== undefined) parts.push(c.gray(stringify(record.meta)))
    let line = parts.join('  ')
    if (record.error) line += `\n${this.#renderError(record.error, 0)}`
    return line
  }
  #renderError(error, depth) {
    const c = this.#chalk
    const { name, message, stack, cause, ...rest } = error
    const head =
      typeof stack === 'string' && stack.length > 0
        ? stack
        : `${name}: ${message}`
    const lines = head.split('\n').map((l) => c.red(`${INDENT}${l}`))
    if (Object.keys(rest).length > 0)
      lines.push(c.gray(`${INDENT}${stringify(rest)}`))
    if (cause !== undefined) {
      if (isErrorLike(cause) && depth < MAX_CAUSE_DEPTH) {
        lines.push(
          c.red(`${INDENT}Caused by:`),
          this.#renderError(cause, depth + 1)
        )
      } else {
        lines.push(c.red(`${INDENT}Caused by: ${stringify(cause)}`))
      }
    }
    return lines.join('\n')
  }
}
//# sourceMappingURL=PrettyFormatter.js.map
