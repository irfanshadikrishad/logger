import {
  Logger,
  PrettyFormatter,
  type LogRecord,
  type Transport,
} from '@/index.js'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'

const plain = () => new PrettyFormatter({ colors: false })
const lastLine = (spy: { mock: { calls: unknown[][] } }): string =>
  String(spy.mock.calls.at(-1)?.[0])

describe('Logger', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>
  let errSpy: jest.SpiedFunction<typeof console.error>
  const savedEnv = process.env['LOG_LEVEL']

  beforeEach(() => {
    delete process.env['LOG_LEVEL']
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    if (savedEnv === undefined) delete process.env['LOG_LEVEL']
    else process.env['LOG_LEVEL'] = savedEnv
  })

  it('writes the standard line format', () => {
    const log = new Logger({ formatter: plain() })
    log.INFO('Server started', { port: 3000 })
    expect(lastLine(logSpy)).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} (AM|PM)  INFO {5}Server started {2}\{"port":3000\}$/
    )
  })

  it('routes ERROR/FATAL to stderr and the rest to stdout', () => {
    const log = new Logger({ formatter: plain(), level: 'DEBUG' })
    log.DEBUG('d')
    log.INFO('i')
    log.SUCCESS('s')
    log.WARN('w')
    expect(logSpy).toHaveBeenCalledTimes(4)
    expect(errSpy).not.toHaveBeenCalled()
    log.ERROR('e')
    log.FATAL('f')
    expect(errSpy).toHaveBeenCalledTimes(2)
  })

  it('filters by level and supports SILENT', () => {
    const log = new Logger({ formatter: plain() })
    log.DEBUG('hidden')
    expect(logSpy).not.toHaveBeenCalled()
    log.setLevel('DEBUG')
    log.DEBUG('shown')
    expect(logSpy).toHaveBeenCalledTimes(1)
    log.setLevel('SILENT')
    log.FATAL('hidden')
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('reads LOG_LEVEL and ignores invalid values', () => {
    process.env['LOG_LEVEL'] = 'warn'
    expect(new Logger().level).toBe('WARN')
    process.env['LOG_LEVEL'] = 'nonsense'
    expect(new Logger().level).toBe('INFO')
  })

  it('throws on invalid configuration only', () => {
    expect(() => new Logger({ level: 'LOUD' as never })).toThrow(TypeError)
    expect(() => new Logger({ maxDepth: 0 })).toThrow(TypeError)
    expect(() => new Logger({ scope: '  ' })).toThrow(TypeError)
    expect(() => new Logger().setLevel('x' as never)).toThrow(TypeError)
  })

  it('creates nested child loggers sharing level', () => {
    const root = new Logger({ formatter: plain(), level: 'DEBUG' })
    const auth = root.child('auth')
    const login = auth.child('login')
    login.WARN('Login failed')
    expect(lastLine(logSpy)).toContain('WARN')
    expect(lastLine(logSpy)).toContain('[auth:login]  Login failed')
    root.setLevel('ERROR')
    login.WARN('now hidden')
    expect(logSpy).toHaveBeenCalledTimes(1)
  })

  it('redacts secrets, handles circular refs and BigInt', () => {
    const log = new Logger({ formatter: plain(), redact: ['sessionId'] })
    const data: Record<string, unknown> = {
      user: 'irfan',
      password: 'hunter2',
      nested: { api_key: 'abc', sessionId: 's1' },
      big: 10n,
    }
    data['self'] = data
    log.INFO('payload', data)
    const line = lastLine(logSpy)
    expect(line).not.toContain('hunter2')
    expect(line).not.toContain('abc')
    expect(line).not.toContain('s1"')
    expect(line).toContain('[REDACTED]')
    expect(line).toContain('[Circular]')
    expect(line).toContain('"10n"')
  })

  it('prints Error metadata with stack and cause', () => {
    const log = new Logger({ formatter: plain() })
    const err = new Error('db down', { cause: new TypeError('socket closed') })
    log.ERROR('Query failed', err)
    const out = lastLine(errSpy)
    expect(out).toContain('Query failed')
    expect(out).toContain('Error: db down')
    expect(out).toContain('Caused by:')
    expect(out).toContain('TypeError: socket closed')
  })

  it('escapes newlines and ANSI in messages (log injection)', () => {
    const log = new Logger({ formatter: plain() })
    log.INFO('ok\n2026-01-01 FATAL fake\u001b[31m')
    const line = lastLine(logSpy)
    expect(line.split('\n')).toHaveLength(1)
    expect(line).toContain('ok\\n2026-01-01 FATAL fake\\x1b[31m')
  })

  it('never throws when a transport or formatter fails, and reports once', () => {
    const received: LogRecord[] = []
    const bad: Transport = {
      write: () => {
        throw new Error('disk full')
      },
    }
    const good: Transport = {
      write: (r) => {
        received.push(r)
      },
    }
    const log = new Logger({ formatter: plain(), transports: [bad, good] })

    expect(() => log.INFO('a')).not.toThrow()
    expect(() => log.INFO('b')).not.toThrow()
    expect(received).toHaveLength(2) // good transport unaffected
    expect(errSpy).toHaveBeenCalledTimes(1) // failure reported once

    const brokenFormatter = new Logger({
      formatter: {
        format: () => {
          throw new Error('boom')
        },
      },
    })
    expect(() => brokenFormatter.INFO('x')).not.toThrow()
  })

  it('tolerates non-string messages at runtime', () => {
    const log = new Logger({ formatter: plain() })
    expect(() => log.INFO(undefined as never)).not.toThrow()
    expect(() => log.INFO({ a: 1 } as never)).not.toThrow()
    expect(lastLine(logSpy)).toContain('{"a":1}')
  })

  it('works through the static facade', () => {
    Logger.configure({ formatter: plain(), level: 'DEBUG' })
    Logger.WARN('static works')
    expect(lastLine(logSpy)).toContain('static works')
    const { WARN } = Logger // detached usage must still work
    WARN('detached works')
    expect(lastLine(logSpy)).toContain('detached works')
    Logger.child('db').ERROR('conn lost')
    expect(lastLine(errSpy)).toContain('[db]  conn lost')
  })
})
