import { PrettyFormatter } from './formatters/PrettyFormatter.js'
import { LEVEL_NAMES, parseLevel } from './levels.js'
import { ConsoleTransport } from './transports/ConsoleTransport.js'
import { createRedactor } from './utils/redact.js'
export const DEFAULTS = {
  level: 'INFO',
  maxDepth: 6,
  maxItems: 100,
  maxStringLength: 10_000,
}
function positiveInt(name, value, fallback) {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`Logger option "${name}" must be a positive integer.`)
  }
  return value
}
export function resolveCore(options, env = process.env) {
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('Logger options must be an object.')
  }
  let level
  if (options.level !== undefined) {
    const parsed = parseLevel(options.level)
    if (!parsed) {
      throw new TypeError(
        `Invalid log level "${String(options.level)}". Expected one of: ${[...LEVEL_NAMES, 'SILENT'].join(', ')}.`
      )
    }
    level = parsed
  } else {
    level = parseLevel(env['LOG_LEVEL']) ?? DEFAULTS.level // bad env value must not crash the app
  }
  const formatter = options.formatter ?? new PrettyFormatter()
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
    sanitize: options.sanitize ?? true,
    normalize: {
      maxDepth: positiveInt('maxDepth', options.maxDepth, DEFAULTS.maxDepth),
      maxItems: positiveInt('maxItems', options.maxItems, DEFAULTS.maxItems),
      maxStringLength: positiveInt(
        'maxStringLength',
        options.maxStringLength,
        DEFAULTS.maxStringLength
      ),
      isSensitiveKey: createRedactor(redact),
    },
    failureReported: false,
  }
}
//# sourceMappingURL=config.js.map
