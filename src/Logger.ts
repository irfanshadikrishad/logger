import { resolveCore, type LoggerCore, type LoggerOptions } from "@/config.js";
import {
  LEVEL_NAMES,
  LEVELS,
  parseLevel,
  priorityOf,
  type LevelThreshold,
  type LogLevel,
} from "@/levels.js";
import type { LogRecord } from "@/types.js";
import { normalize, serializeError, stringify } from "@/utils/serialize.js";
import {
  joinScope,
  normalizeScope,
  sanitizeText,
  truncate,
} from "@/utils/text.js";

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
  static #shared: Logger | undefined;

  readonly scope: string | undefined;
  readonly #core: LoggerCore;

  /**
   * @param options configuration (ignored except `scope` when `parent` is given)
   * @param parent  internal: used by `child()` to share the parent's configuration
   */
  constructor(options: LoggerOptions = {}, parent?: Logger) {
    if (parent !== undefined) {
      this.#core = parent.#core;
      this.scope = joinScope(parent.scope, normalizeScope(options.scope));
    } else {
      this.#core = resolveCore(options);
      this.scope = normalizeScope(options.scope);
    }
  }

  // ───────────────────────── static facade ─────────────────────────

  static DEBUG(message: string, meta?: unknown): void {
    Logger.#default().DEBUG(message, meta);
  }
  static INFO(message: string, meta?: unknown): void {
    Logger.#default().INFO(message, meta);
  }
  static SUCCESS(message: string, meta?: unknown): void {
    Logger.#default().SUCCESS(message, meta);
  }
  static WARN(message: string, meta?: unknown): void {
    Logger.#default().WARN(message, meta);
  }
  static ERROR(message: string, meta?: unknown): void {
    Logger.#default().ERROR(message, meta);
  }
  static FATAL(message: string, meta?: unknown): void {
    Logger.#default().FATAL(message, meta);
  }

  /** Replaces the shared default instance. Call once at app start. Previously created children keep the old config. */
  static configure(options: LoggerOptions = {}): Logger {
    Logger.#shared = new Logger(options);
    return Logger.#shared;
  }

  static child(scope: string): Logger {
    return Logger.#default().child(scope);
  }

  static setLevel(level: LevelThreshold): void {
    Logger.#default().setLevel(level);
  }

  static get level(): LevelThreshold {
    return Logger.#default().level;
  }

  static isLevelEnabled(level: LogLevel): boolean {
    return Logger.#default().isLevelEnabled(level);
  }

  static #default(): Logger {
    return (Logger.#shared ??= new Logger());
  }

  // ───────────────────────── instance API ─────────────────────────

  DEBUG(message: string, meta?: unknown): void {
    this.#log("DEBUG", message, meta);
  }
  INFO(message: string, meta?: unknown): void {
    this.#log("INFO", message, meta);
  }
  SUCCESS(message: string, meta?: unknown): void {
    this.#log("SUCCESS", message, meta);
  }
  WARN(message: string, meta?: unknown): void {
    this.#log("WARN", message, meta);
  }
  ERROR(message: string, meta?: unknown): void {
    this.#log("ERROR", message, meta);
  }
  /** Logs only. It never terminates the process. */
  FATAL(message: string, meta?: unknown): void {
    this.#log("FATAL", message, meta);
  }

  /** Scoped logger sharing this logger's configuration and level. Scopes nest as `parent:child`. */
  child(scope: string): Logger {
    return new Logger({ scope }, this);
  }

  get level(): LevelThreshold {
    return this.#core.level;
  }

  /** Changes the level for this logger, its parent chain's shared config and all children. */
  setLevel(level: LevelThreshold): void {
    const parsed = parseLevel(level);
    if (!parsed) {
      throw new TypeError(
        `Invalid log level "${String(level)}". Expected one of: ${[...LEVEL_NAMES, "SILENT"].join(", ")}.`,
      );
    }
    this.#core.level = parsed;
  }

  /** Cheap guard to skip building expensive metadata. */
  isLevelEnabled(level: LogLevel): boolean {
    return LEVELS[level] >= priorityOf(this.#core.level);
  }

  // ───────────────────────── internals ─────────────────────────

  #log(level: LogLevel, message: unknown, meta: unknown): void {
    const core = this.#core;
    if (LEVELS[level] < priorityOf(core.level)) return;

    try {
      const record = this.#buildRecord(core, level, message, meta);
      const line = core.formatter.format(record);
      for (const transport of core.transports) {
        try {
          transport.write(record, line);
        } catch (error) {
          Logger.#reportFailure(core, error); // one broken transport must not block the others
        }
      }
    } catch (error) {
      Logger.#reportFailure(core, error); // logging must never crash the host application
    }
  }

  #buildRecord(
    core: LoggerCore,
    level: LogLevel,
    message: unknown,
    meta: unknown,
  ): LogRecord {
    const { maxStringLength } = core.normalize;

    let text: string;
    if (typeof message === "string") text = message;
    else if (message instanceof Error)
      text = `${message.name}: ${message.message}`;
    else text = stringify(normalize(message, core.normalize));
    text = core.sanitize
      ? sanitizeText(text, maxStringLength)
      : truncate(text, maxStringLength);

    const base = {
      timestamp: new Date(),
      level,
      scope: this.scope,
      message: text,
    };
    if (meta === undefined) return base;
    if (meta instanceof Error)
      return { ...base, error: serializeError(meta, core.normalize) };
    return { ...base, meta: normalize(meta, core.normalize) };
  }

  static #reportFailure(core: LoggerCore, error: unknown): void {
    if (core.failureReported) return; // report once, never spam
    core.failureReported = true;
    try {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`[@irfanshadikrishad/logger] internal error: ${reason}`);
    } catch {
      /* nothing left to do */
    }
  }
}
