import { PrettyFormatter, formatTimestamp, type LogRecord } from '@/index.js'
import { describe, expect, it } from '@jest/globals'

const record = (over: Partial<LogRecord> = {}): LogRecord => ({
  timestamp: new Date(2026, 10, 3, 15, 5, 9, 7),
  level: 'WARN',
  message: 'hello',
  ...over,
})

describe('formatTimestamp', () => {
  it('uses local 12-hour time', () => {
    expect(formatTimestamp(new Date(2026, 10, 3, 0, 5, 9, 7))).toBe(
      '2026-11-03 12:05:09.007 AM'
    )
    expect(formatTimestamp(new Date(2026, 10, 3, 12, 30, 0, 0))).toBe(
      '2026-11-03 12:30:00.000 PM'
    )
    expect(formatTimestamp(new Date(2026, 10, 3, 13, 0, 0, 0))).toBe(
      '2026-11-03 01:00:00.000 PM'
    )
    expect(formatTimestamp(new Date(2026, 10, 3, 9, 59, 59, 999))).toBe(
      '2026-11-03 09:59:59.999 AM'
    )
  })
})

describe('PrettyFormatter', () => {
  it('can disable colours', () => {
    expect(
      new PrettyFormatter({ colors: false }).format(record())
    ).not.toContain('\u001b[')
  })

  it('can force colours', () => {
    expect(new PrettyFormatter({ colors: true }).format(record())).toContain(
      '\u001b['
    )
  })

  it('supports hiding or customising the timestamp', () => {
    expect(
      new PrettyFormatter({ colors: false, timestamp: false }).format(record())
    ).toBe('WARN     hello')
    expect(
      new PrettyFormatter({ colors: false, timestamp: () => 'T' }).format(
        record()
      )
    ).toBe('T  WARN     hello')
  })

  it('renders scope and aligns every level', () => {
    const f = new PrettyFormatter({ colors: false, timestamp: false })
    expect(f.format(record({ scope: 'auth', level: 'SUCCESS' }))).toBe(
      'SUCCESS  [auth]  hello'
    )
    expect(f.format(record({ level: 'FATAL' }))).toBe('FATAL    hello')
  })
})
