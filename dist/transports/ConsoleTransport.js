import { LEVELS } from '../levels.js';
/**
 * ERROR and FATAL go to stderr, everything else to stdout.
 * Uses `console.*`, which swallows EPIPE-style stream errors instead of crashing the process.
 */
export class ConsoleTransport {
    write(record, formatted) {
        if (LEVELS[record.level] >= LEVELS.ERROR)
            console.error(formatted);
        else
            console.log(formatted);
    }
}
//# sourceMappingURL=ConsoleTransport.js.map