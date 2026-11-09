#### [Logger]

One standard, colourised log format for every Node.js project. ESM-only, TypeScript, Node 20.19+.

![NPM Version](https://img.shields.io/npm/v/%40irfanshadikrishad%2Flogger?style=for-the-badge&labelColor=141b23&color=%2385c1dc)
![NPM Downloads](https://img.shields.io/npm/dw/%40irfanshadikrishad%2Flogger?style=for-the-badge&labelColor=141b23&color=%2385c1dc)
![NPM License](https://img.shields.io/npm/l/%40irfanshadikrishad%2Flogger?style=for-the-badge&labelColor=141b23&color=%2385c1dc)

```bash
2026-11-03 10:15:30.123 AM  INFO     Server started  {"port":3000}
2026-11-03 10:15:30.140 AM  WARN     [auth]  Login failed  {"userId":42}
```

#### [Install]

```bash
npm install @irfanshadikrishad/logger
```

#### [Usage]

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

#### [Log levels]

Every message has a level that describes how serious it is. The `level` setting is the **minimum level that gets printed**: that level and everything more severe is shown, everything less severe is silently skipped. It does not mean "show only this level".

Levels, from least to most severe:

| Level     | Use it for                                       | Printed to |
| --------- | ------------------------------------------------ | ---------- |
| `DEBUG`   | Detailed diagnostics while developing            | stdout     |
| `INFO`    | Normal events (server started, request handled)  | stdout     |
| `SUCCESS` | An operation finished successfully               | stdout     |
| `WARN`    | Something unexpected, but the app keeps working  | stdout     |
| `ERROR`   | An operation failed                              | stderr     |
| `FATAL`   | The app cannot continue (logs only, never exits) | stderr     |

Given this code:

```ts
Logger.DEBUG('Loading config')
Logger.INFO('Server started')
Logger.SUCCESS('Connected to database')
Logger.WARN('Disk almost full')
Logger.ERROR('Query failed')
Logger.FATAL('Unrecoverable state')
```

this is what each `level` setting prints:

| `level`          | Printed                                                         |
| ---------------- | --------------------------------------------------------------- |
| `DEBUG`          | all six lines                                                   |
| `INFO` (default) | `INFO`, `SUCCESS`, `WARN`, `ERROR`, `FATAL` (`DEBUG` is hidden) |
| `WARN`           | `WARN`, `ERROR`, `FATAL`                                        |
| `ERROR`          | `ERROR`, `FATAL`                                                |
| `FATAL`          | `FATAL` only                                                    |
| `SILENT`         | nothing                                                         |

With the default `INFO`, `Logger.DEBUG('Loading config')` prints nothing. The call still runs, but the logger skips the output.

Typical choices:

- **Development:** `DEBUG`, to see everything.
- **Production:** `INFO` or `WARN`, to cut noise and log volume.
- **Debugging a live problem:** run once with `LOG_LEVEL=DEBUG node app.js`, with no code change.
- **Tests or CLI tools:** `SILENT`, to mute the logger completely.

Ways to set it (highest priority first):

```ts
// 1. In code, at your app's entry point
Logger.configure({ level: 'DEBUG' })
```

```bash
# 2. Environment variable (overrides the config file)
LOG_LEVEL=WARN node app.js
```

```json
// 3. logger.config.json
{ "level": "DEBUG" }
```

If none is set, the level is `INFO`. Values are case-insensitive, and an invalid `LOG_LEVEL` is ignored.

You can also change it while the app is running, and the change applies to every child logger too:

```ts
Logger.setLevel('ERROR')
Logger.level // 'ERROR'
```

Hidden levels still cost you the work of building their arguments. For expensive metadata, check first:

```ts
if (Logger.isLevelEnabled('DEBUG')) {
  Logger.DEBUG('Full state', buildHugeObject())
}
```

#### [Redact]

`redact` masks the values of sensitive keys in the metadata you pass to a log call. The key stays in the output and the value is replaced with [REDACTED], so you can see the field was there without leaking its content.

**Usage:**

```ts
Logger.INFO('Login attempt', {
  email: 'a@b.com',
  password: 'hunter2',
  token: 'abc123',
})
// ... INFO  Login attempt  {"email":"a@b.com","password":"[REDACTED]","token":"[REDACTED]"}
```

**Add your own redact keys:**

```json
// in logger.config.json
{ "redact": ["sessionId", "phone", "nid"] }
```

```ts
// or in code
Logger.configure({ redact: ['sessionId', 'phone', 'nid'] })
```

#### [Configuration]

**Option 1: config file (no code)**

Create `logger.config.json` in your project root (`.cjs`, `.js` and `.mjs` also work). It is found automatically,
searching from the working directory up to the nearest `package.json`.

```json
{
  "level": "DEBUG",
  "badge": "ALL",
  "timestamp": { "timezone": "utc", "hourCycle": 24 },
  "redact": ["sessionId"]
}
```

| Key                                                   | Values                                                                                                                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `level`                                               | Minimum level to print, see [Log levels](#log-levels). `DEBUG` `INFO` `SUCCESS` `WARN` `ERROR` `FATAL` `SILENT` (default `INFO`; the `LOG_LEVEL` env var overrides it) |
| `badge`                                               | `DEFAULT` coloured text, badge on `FATAL` only (default) · `ALL` badge on every level · `HYBRID` badges on `WARN`/`ERROR`/`FATAL`                                      |
| `timestamp`                                           | `false`, or `{ timezone: "local"\|"utc", hourCycle: 12\|24, date: true\|false, milliseconds: true\|false, format: "standard"\|"iso" }`                                 |
| `colors`                                              | `true` force on, `false` off, omit for auto (TTY, `FORCE_COLOR`, `NO_COLOR`)                                                                                           |
| `redact`                                              | Extra metadata keys to mask (on top of `password`, `token`, `apiKey`, ...)                                                                                             |
| `sanitize`, `maxDepth`, `maxItems`, `maxStringLength` | Safety limits (see below)                                                                                                                                              |
| `styles`                                              | Per-level style functions. JS config files only                                                                                                                        |

JS config with custom styles:

```js
// logger.config.cjs
/** @type {import('@irfanshadikrishad/logger').LoggerConfigFile} */
module.exports = {
  badge: 'HYBRID',
  styles: { INFO: (c) => c.blue },
}
```

Notes:

- `.json` and `.cjs` load on any Node 20; `.js` / `.mjs` need Node 20.19+ and must not use top-level `await`.
- A config file is project code: `.js` / `.cjs` / `.mjs` files are executed. Only the project folder tree is searched.
- An invalid config file never crashes your app while logging: one error is printed and defaults are used.
- Where the file system or working directory differs (some serverless/edge bundles), use code configuration instead.

**Option 2: in code (optional)**

Call once at your app's entry point. Every other file just imports `Logger`.

```ts
import { Logger, PrettyFormatter } from '@irfanshadikrishad/logger'

Logger.configure({
  level: 'DEBUG',
  formatter: new PrettyFormatter({
    levelStyle: 'hybrid',
    timestamp: { timezone: 'utc', hourCycle: 24, milliseconds: false },
  }),
})
```

Precedence (highest first): code options, `LOG_LEVEL` env var (level only), config file, defaults.
Pass `configFile: false` to ignore config files, or `configFile: './path/to/file.json'` to choose one.

| Option                                      | Default                               | Notes                                                        |
| ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| `level`                                     | `LOG_LEVEL`, config file, else `INFO` | `SILENT` disables output                                     |
| `scope`                                     | none                                  | Label on every line                                          |
| `formatter`                                 | `PrettyFormatter`                     | Implement `Formatter` for new styles                         |
| `transports`                                | `[ConsoleTransport]`                  | Implement `Transport` for file/remote                        |
| `redact`                                    | `[]`                                  | Extra keys to mask                                           |
| `sanitize`                                  | `true`                                | Escapes newlines/ANSI in messages (log-injection protection) |
| `maxDepth` / `maxItems` / `maxStringLength` | 6 / 100 / 10 000                      | Bounds on metadata size                                      |
| `configFile`                                | search upward                         | `false` to disable, or a path                                |

#### [Behaviour]

- `ERROR` and `FATAL` go to stderr, everything else to stdout.
- Timestamps default to local time, 12-hour (`2026-11-03 10:15:30.123 AM`). UTC output is suffixed with ` UTC`.
- Metadata is made JSON-safe: circular refs, BigInt, Map/Set, Errors, Dates and throwing getters are handled.
- Logging never throws into your app. Only invalid configuration throws, at construction time.
- Use `Logger.isLevelEnabled('DEBUG')` to skip building expensive metadata.

#### [Support]

Need help with Logger, encountered a bug, or have an idea for improvement? I'm happy to help!

You can reach out through either of the following channels:

- Report an issue: Create a GitHub [Issue](https://github.com/irfanshadikrishad/logger/issues/new) to report bugs, request features, or discuss technical problems.
- Email support: [hello@irfanshadikrishad.dev](mailto:hello@irfanshadikrishad.dev?subject=Logger%20-%20Support%20Request) for questions, assistance, or anything else related to Logger.

When reporting a bug, please include relevant details, steps to reproduce the issue or anything that would help fix it.
