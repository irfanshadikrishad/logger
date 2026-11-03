/** Numeric priority of every log level. Higher = more severe. */
export const LEVELS = {
  DEBUG: 10,
  INFO: 20,
  SUCCESS: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
} as const;

export type LogLevel = keyof typeof LEVELS;

/** A threshold is any level, or SILENT to disable all output. */
export type LevelThreshold = LogLevel | 'SILENT';

export const LEVEL_NAMES = Object.keys(LEVELS) as readonly LogLevel[];

/** Parses user/env input (case-insensitive). Returns `undefined` when invalid. */
export function parseLevel(input: unknown): LevelThreshold | undefined {
  if (typeof input !== 'string') return undefined;
  const name = input.trim().toUpperCase();
  if (name === 'SILENT') return 'SILENT';
  return Object.hasOwn(LEVELS, name) ? (name as LogLevel) : undefined;
}

export function priorityOf(level: LevelThreshold): number {
  return level === 'SILENT' ? Number.POSITIVE_INFINITY : LEVELS[level];
}
