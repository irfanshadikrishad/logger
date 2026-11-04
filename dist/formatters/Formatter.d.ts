import type { LogRecord } from '../types.js';
/** Turns a record into the final string. Implement this to add new output styles. */
export interface Formatter {
    format(record: LogRecord): string;
}
//# sourceMappingURL=Formatter.d.ts.map