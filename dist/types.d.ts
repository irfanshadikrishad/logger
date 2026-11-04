import type { LogLevel } from './levels.js'
import type { SerializedError } from './utils/serialize.js'
/** A fully prepared, JSON-safe log entry handed to formatters and transports. */
export interface LogRecord {
  readonly timestamp: Date
  readonly level: LogLevel
  readonly scope?: string | undefined
  readonly message: string
  /** Normalised (JSON-safe, redacted) metadata. */
  readonly meta?: unknown
  /** Present when an `Error` was passed as metadata. */
  readonly error?: SerializedError
}
//# sourceMappingURL=types.d.ts.map
