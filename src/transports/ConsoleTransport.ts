import { LEVELS } from "@/levels.js";
import type { LogRecord } from "@/types.js";
import type { Transport } from "@/transports/Transport.js";

/**
 * ERROR and FATAL go to stderr, everything else to stdout.
 * Uses `console.*`, which swallows EPIPE-style stream errors instead of crashing the process.
 */
export class ConsoleTransport implements Transport {
  write(record: LogRecord, formatted: string): void {
    if (LEVELS[record.level] >= LEVELS.ERROR) console.error(formatted);
    else console.log(formatted);
  }
}
