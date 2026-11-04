/** Numeric priority of every log level. Higher = more severe. */
export const LEVELS = {
    DEBUG: 10,
    INFO: 20,
    SUCCESS: 30,
    WARN: 40,
    ERROR: 50,
    FATAL: 60,
};
export const LEVEL_NAMES = Object.keys(LEVELS);
/** Parses user/env input (case-insensitive). Returns `undefined` when invalid. */
export function parseLevel(input) {
    if (typeof input !== 'string')
        return undefined;
    const name = input.trim().toUpperCase();
    if (name === 'SILENT')
        return 'SILENT';
    return Object.hasOwn(LEVELS, name) ? name : undefined;
}
export function priorityOf(level) {
    return level === 'SILENT' ? Number.POSITIVE_INFINITY : LEVELS[level];
}
//# sourceMappingURL=levels.js.map