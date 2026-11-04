import type { LogRecord } from '../types.js';
/** A destination for logs (console today; file/HTTP can implement this later). */
export interface Transport {
    write(record: LogRecord, formatted: string): void;
}
//# sourceMappingURL=Transport.d.ts.map