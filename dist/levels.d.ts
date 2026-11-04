/** Numeric priority of every log level. Higher = more severe. */
export declare const LEVELS: {
    readonly DEBUG: 10;
    readonly INFO: 20;
    readonly SUCCESS: 30;
    readonly WARN: 40;
    readonly ERROR: 50;
    readonly FATAL: 60;
};
export type LogLevel = keyof typeof LEVELS;
/** A threshold is any level, or SILENT to disable all output. */
export type LevelThreshold = LogLevel | 'SILENT';
export declare const LEVEL_NAMES: readonly LogLevel[];
/** Parses user/env input (case-insensitive). Returns `undefined` when invalid. */
export declare function parseLevel(input: unknown): LevelThreshold | undefined;
export declare function priorityOf(level: LevelThreshold): number;
//# sourceMappingURL=levels.d.ts.map