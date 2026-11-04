import type { Formatter } from './formatters/Formatter.js';
import { type LevelThreshold } from './levels.js';
import type { Transport } from './transports/Transport.js';
import type { NormalizeOptions } from './utils/serialize.js';
export interface LoggerOptions {
    /** Minimum level to output. Default: `LOG_LEVEL` env var, else config file, else `INFO`. `SILENT` disables output. */
    level?: LevelThreshold;
    /** Label added to every line, e.g. `auth` -> `[auth]`. */
    scope?: string;
    /** Default: `PrettyFormatter` (configured by the config file, if any). */
    formatter?: Formatter;
    /** Default: `[new ConsoleTransport()]`. */
    transports?: Transport[];
    /** Extra metadata keys to mask, on top of the built-in list and the config file. */
    redact?: string[];
    /** Escape control characters (newlines, ANSI) in messages. Default: `true`. */
    sanitize?: boolean;
    /** Max nesting depth of metadata. Default: 6. */
    maxDepth?: number;
    /** Max array items / object keys kept per level. Default: 100. */
    maxItems?: number;
    /** Max length of any string. Default: 10 000. */
    maxStringLength?: number;
    /**
     * `logger.config.*` handling. Default: search upward from the working directory.
     * `false`: ignore config files. `string`: explicit path (relative to the working directory).
     */
    configFile?: boolean | string;
}
/** State shared between a logger and all of its children. */
export interface LoggerCore {
    level: LevelThreshold;
    readonly formatter: Formatter;
    readonly transports: readonly Transport[];
    readonly sanitize: boolean;
    readonly normalize: NormalizeOptions;
    failureReported: boolean;
}
export declare const DEFAULTS: {
    readonly level: "INFO";
    readonly maxDepth: 6;
    readonly maxItems: 100;
    readonly maxStringLength: 10000;
};
/**
 * Precedence (highest first): explicit options > `LOG_LEVEL` env (level only) > config file > defaults.
 */
export declare function resolveCore(options: LoggerOptions, env?: NodeJS.ProcessEnv): LoggerCore;
//# sourceMappingURL=config.d.ts.map