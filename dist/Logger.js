var _a
import { resolveCore } from './config.js'
import { LEVEL_NAMES, LEVELS, parseLevel, priorityOf } from './levels.js'
import { normalize, serializeError, stringify } from './utils/serialize.js'
import {
  joinScope,
  normalizeScope,
  sanitizeText,
  truncate,
} from './utils/text.js'
/**
 * Standard logger.
 *
 *   Logger.INFO('Server started', { port: 3000 });   // static facade (shared default instance)
 *   const log = Logger.child('auth');                 // scoped logger
 *   log.WARN('Login failed', { userId: 42 });
 *
 * A logger never throws while logging; only invalid *configuration* throws (fail fast).
 */
export class Logger {
  static #shared
  scope
  #core
  /**
   * @param options configuration (ignored except `scope` when `parent` is given)
   * @param parent  internal: used by `child()` to share the parent's configuration
   */
  constructor(options = {}, parent) {
    if (parent !== undefined) {
      this.#core = parent.#core
      this.scope = joinScope(parent.scope, normalizeScope(options.scope))
    } else {
      this.#core = resolveCore(options)
      this.scope = normalizeScope(options.scope)
    }
  }
  // ───────────────────────── static facade ─────────────────────────
  static DEBUG(message, meta) {
    _a.#default().DEBUG(message, meta)
  }
  static INFO(message, meta) {
    _a.#default().INFO(message, meta)
  }
  static SUCCESS(message, meta) {
    _a.#default().SUCCESS(message, meta)
  }
  static WARN(message, meta) {
    _a.#default().WARN(message, meta)
  }
  static ERROR(message, meta) {
    _a.#default().ERROR(message, meta)
  }
  static FATAL(message, meta) {
    _a.#default().FATAL(message, meta)
  }
  /** Replaces the shared default instance. Call once at app start. Previously created children keep the old config. */
  static configure(options = {}) {
    _a.#shared = new _a(options)
    return _a.#shared
  }
  static child(scope) {
    return _a.#default().child(scope)
  }
  static setLevel(level) {
    _a.#default().setLevel(level)
  }
  static get level() {
    return _a.#default().level
  }
  static isLevelEnabled(level) {
    return _a.#default().isLevelEnabled(level)
  }
  static #default() {
    if (_a.#shared !== undefined) return _a.#shared
    try {
      _a.#shared = new _a()
    } catch (error) {
      // A broken config file must never crash the host app from inside a log call.
      try {
        const reason = error instanceof Error ? error.message : String(error)
        console.error(
          `[@irfanshadikrishad/logger] ${reason} Falling back to defaults.`
        )
      } catch {
        /* nothing left to do */
      }
      _a.#shared = new _a({ configFile: false })
    }
    return _a.#shared
  }
  // ───────────────────────── instance API ─────────────────────────
  DEBUG(message, meta) {
    this.#log('DEBUG', message, meta)
  }
  INFO(message, meta) {
    this.#log('INFO', message, meta)
  }
  SUCCESS(message, meta) {
    this.#log('SUCCESS', message, meta)
  }
  WARN(message, meta) {
    this.#log('WARN', message, meta)
  }
  ERROR(message, meta) {
    this.#log('ERROR', message, meta)
  }
  /** Logs only. It never terminates the process. */
  FATAL(message, meta) {
    this.#log('FATAL', message, meta)
  }
  /** Scoped logger sharing this logger's configuration and level. Scopes nest as `parent:child`. */
  child(scope) {
    return new _a({ scope }, this)
  }
  get level() {
    return this.#core.level
  }
  /** Changes the level for this logger, its parent chain's shared config and all children. */
  setLevel(level) {
    const parsed = parseLevel(level)
    if (!parsed) {
      throw new TypeError(
        `Invalid log level "${String(level)}". Expected one of: ${[...LEVEL_NAMES, 'SILENT'].join(', ')}.`
      )
    }
    this.#core.level = parsed
  }
  /** Cheap guard to skip building expensive metadata. */
  isLevelEnabled(level) {
    return LEVELS[level] >= priorityOf(this.#core.level)
  }
  // ───────────────────────── internals ─────────────────────────
  #log(level, message, meta) {
    const core = this.#core
    if (LEVELS[level] < priorityOf(core.level)) return
    try {
      const record = this.#buildRecord(core, level, message, meta)
      const line = core.formatter.format(record)
      for (const transport of core.transports) {
        try {
          transport.write(record, line)
        } catch (error) {
          _a.#reportFailure(core, error) // one broken transport must not block the others
        }
      }
    } catch (error) {
      _a.#reportFailure(core, error) // logging must never crash the host application
    }
  }
  #buildRecord(core, level, message, meta) {
    const { maxStringLength } = core.normalize
    let text
    if (typeof message === 'string') text = message
    else if (message instanceof Error)
      text = `${message.name}: ${message.message}`
    else text = stringify(normalize(message, core.normalize))
    text = core.sanitize
      ? sanitizeText(text, maxStringLength)
      : truncate(text, maxStringLength)
    const base = {
      timestamp: new Date(),
      level,
      scope: this.scope,
      message: text,
    }
    if (meta === undefined) return base
    if (meta instanceof Error)
      return { ...base, error: serializeError(meta, core.normalize) }
    return { ...base, meta: normalize(meta, core.normalize) }
  }
  static #reportFailure(core, error) {
    if (core.failureReported) return // report once, never spam
    core.failureReported = true
    try {
      const reason = error instanceof Error ? error.message : String(error)
      console.error(`[@irfanshadikrishad/logger] internal error: ${reason}`)
    } catch {
      /* nothing left to do */
    }
  }
}
_a = Logger
//# sourceMappingURL=Logger.js.map
