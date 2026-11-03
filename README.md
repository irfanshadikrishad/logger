#### Logger

One standard, colourised log format for every Node.js project. ESM-only, TypeScript, Node 20+.

![NPM Version](https://img.shields.io/npm/v/%40irfanshadikrishad%2Flogger?style=for-the-badge&labelColor=141b23&color=%2385c1dc)
![NPM Downloads](https://img.shields.io/npm/dw/%40irfanshadikrishad%2Flogger?style=for-the-badge&labelColor=141b23&color=%2385c1dc)
![NPM License](https://img.shields.io/npm/l/%40irfanshadikrishad%2Flogger?style=for-the-badge&labelColor=141b23&color=%2385c1dc)

```bash
2026-11-03 10:15:30.123 AM  INFO     Server started  {"port":3000}
2026-11-03 10:15:30.140 AM  WARN     [auth]  Login failed  {"userId":42}
```

#### Install

```bash
npm install @irfanshadikrishad/logger
```

#### Usage

```ts
import { Logger } from '@irfanshadikrishad/logger'

Logger.DEBUG('Loading config')
Logger.INFO('Server started', { port: 3000 })
Logger.SUCCESS('Connected to database')
Logger.WARN('Disk almost full', { freeGb: 2 })
Logger.ERROR('Query failed', new Error('db down', { cause: err }))
Logger.FATAL('Unrecoverable state') // logs only, never exits the process

// Scoped (child) loggers
const log = Logger.child('auth')
log.WARN('Login failed', { userId: 42 }) // ... WARN  [auth]  Login failed
log.child('oauth').INFO('Token refreshed') // [auth:oauth]
```

#### Configure once at startup (optional)

```ts
Logger.configure({
  level: 'DEBUG', // default: LOG_LEVEL env, else INFO ('SILENT' disables)
  redact: ['sessionId'], // added to the built-in list (password, token, apiKey, ...)
})
```

| Option                                      | Default               | Notes                                                        |
| ------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| `level`                                     | `LOG_LEVEL` or `INFO` | `DEBUG` `INFO` `SUCCESS` `WARN` `ERROR` `FATAL` `SILENT`     |
| `scope`                                     | none                  | Label on every line                                          |
| `formatter`                                 | `PrettyFormatter`     | Implement `Formatter` for new styles                         |
| `transports`                                | `[ConsoleTransport]`  | Implement `Transport` for file/remote                        |
| `redact`                                    | `[]`                  | Extra keys to mask                                           |
| `sanitize`                                  | `true`                | Escapes newlines/ANSI in messages (log-injection protection) |
| `maxDepth` / `maxItems` / `maxStringLength` | 6 / 100 / 10 000      | Bounds on metadata size                                      |

#### Behaviour

- `ERROR` and `FATAL` go to stderr, everything else to stdout.
- Colours follow TTY detection, `FORCE_COLOR` and `NO_COLOR`.
- Metadata is made JSON-safe: circular refs, BigInt, Map/Set, Errors, Dates and throwing getters are handled.
- Logging never throws into your app. Only invalid configuration throws, at construction time.
- Use `Logger.isLevelEnabled('DEBUG')` to skip building expensive metadata.
