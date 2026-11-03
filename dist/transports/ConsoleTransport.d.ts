import type { LogRecord } from '../types.js';
import type { Transport } from './Transport.js';
/**
 * ERROR and FATAL go to stderr, everything else to stdout.
 * Uses `console.*`, which swallows EPIPE-style stream errors instead of crashing the process.
 */
export declare class ConsoleTransport implements Transport {
    write(record: LogRecord, formatted: string): void;
}
//# sourceMappingURL=ConsoleTransport.d.ts.map