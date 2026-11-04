import { type LoggerOptions } from './config.js';
import { type LevelThreshold, type LogLevel } from './levels.js';
/**
 * Standard logger.
 *
 *   Logger.INFO('Server started', { port: 3000 });   // static facade (shared default instance)
 *   const log = Logger.child('auth');                 // scoped logger
 *   log.WARN('Login failed', { userId: 42 });
 *
 * A logger never throws while logging; only invalid *configuration* throws (fail fast).
 */
export declare class Logger {
    #private;
    readonly scope: string | undefined;
    /**
     * @param options configuration (ignored except `scope` when `parent` is given)
     * @param parent  internal: used by `child()` to share the parent's configuration
     */
    constructor(options?: LoggerOptions, parent?: Logger);
    static DEBUG(message: string, meta?: unknown): void;
    static INFO(message: string, meta?: unknown): void;
    static SUCCESS(message: string, meta?: unknown): void;
    static WARN(message: string, meta?: unknown): void;
    static ERROR(message: string, meta?: unknown): void;
    static FATAL(message: string, meta?: unknown): void;
    /** Replaces the shared default instance. Call once at app start. Previously created children keep the old config. */
    static configure(options?: LoggerOptions): Logger;
    static child(scope: string): Logger;
    static setLevel(level: LevelThreshold): void;
    static get level(): LevelThreshold;
    static isLevelEnabled(level: LogLevel): boolean;
    DEBUG(message: string, meta?: unknown): void;
    INFO(message: string, meta?: unknown): void;
    SUCCESS(message: string, meta?: unknown): void;
    WARN(message: string, meta?: unknown): void;
    ERROR(message: string, meta?: unknown): void;
    /** Logs only. It never terminates the process. */
    FATAL(message: string, meta?: unknown): void;
    /** Scoped logger sharing this logger's configuration and level. Scopes nest as `parent:child`. */
    child(scope: string): Logger;
    get level(): LevelThreshold;
    /** Changes the level for this logger, its parent chain's shared config and all children. */
    setLevel(level: LevelThreshold): void;
    /** Cheap guard to skip building expensive metadata. */
    isLevelEnabled(level: LogLevel): boolean;
}
//# sourceMappingURL=Logger.d.ts.map