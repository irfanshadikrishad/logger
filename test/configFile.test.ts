import {
  clearConfigFileCache,
  findConfigFile,
  loadConfigFile,
} from '@/configFile.js'
import { Logger, PrettyFormatter } from '@/index.js'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

describe('config file', () => {
  let dir: string
  const savedEnv = process.env['LOG_LEVEL']
  const write = (name: string, content: string): string => {
    const file = path.join(dir, name)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, content)
    return file
  }

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'logger-cfg-'))
    delete process.env['LOG_LEVEL']
    clearConfigFileCache()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    rmSync(dir, { recursive: true, force: true })
    if (savedEnv === undefined) delete process.env['LOG_LEVEL']
    else process.env['LOG_LEVEL'] = savedEnv
  })

  describe('findConfigFile', () => {
    it('searches upward, prefers json, and stops at the project root', () => {
      write('proj/package.json', '{}')
      const cfg = write('proj/logger.config.json', '{}')
      write('proj/logger.config.cjs', 'module.exports = {};')
      mkdirSync(path.join(dir, 'proj/src/deep'), { recursive: true })
      expect(findConfigFile(path.join(dir, 'proj/src/deep'))).toBe(cfg)

      write('outer/logger.config.json', '{}')
      write('outer/proj/package.json', '{}')
      mkdirSync(path.join(dir, 'outer/proj/src'), { recursive: true })
      expect(findConfigFile(path.join(dir, 'outer/proj/src'))).toBeUndefined()
    })
  })

  describe('loadConfigFile', () => {
    it('loads and normalises a JSON config', () => {
      const file = write(
        'a.json',
        '\uFEFF{"level":"debug","badge":"all","timestamp":{"timezone":"utc","hourCycle":24},"redact":["sessionId"],"colors":false}'
      )
      expect(loadConfigFile(file)).toEqual({
        level: 'DEBUG',
        levelStyle: 'badge',
        timestamp: { timezone: 'utc', hourCycle: 24 },
        redact: ['sessionId'],
        colors: false,
      })
    })

    it('loads a CJS config with style functions', () => {
      const file = write(
        'b.cjs',
        "module.exports = { badge: 'HYBRID', styles: { INFO: (c) => c.blue } };"
      )
      const cfg = loadConfigFile(file)
      expect(cfg.levelStyle).toBe('hybrid')
      expect(typeof cfg.styles?.INFO).toBe('function')
    })

    it('returns {} when nothing is found and throws clearly on bad input', () => {
      expect(loadConfigFile(write('c.json', '{}'))).toEqual({})
      expect(() => loadConfigFile(path.join(dir, 'missing.json'))).toThrow(
        /not found/
      )
      expect(() => loadConfigFile(write('d.json', '{ nope'))).toThrow(
        /Failed to load/
      )
      expect(() => loadConfigFile(write('e.json', '{"bagde":"ALL"}'))).toThrow(
        /unknown key "bagde"/
      )
      expect(() => loadConfigFile(write('f.json', '{"badge":"SOME"}'))).toThrow(
        /"badge" must be/
      )
      expect(() => loadConfigFile(write('g.json', '{"level":"LOUD"}'))).toThrow(
        /"level" must be/
      )
      expect(() =>
        loadConfigFile(write('h.json', '{"timestamp":{"hourCycle":7}}'))
      ).toThrow(/hourCycle/)
      expect(() => loadConfigFile(write('i.json', '{"maxDepth":0}'))).toThrow(
        /maxDepth/
      )
      expect(() =>
        loadConfigFile(write('j.json', '{"styles":{"INFO":"red"}}'))
      ).toThrow(/must be a function/)
      expect(() => loadConfigFile(write('k.json', '[]'))).toThrow(
        /expected an object/
      )
    })
  })

  describe('Logger integration', () => {
    it('applies the file, and explicit options / env override it', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      const file = write(
        'l.json',
        '{"level":"DEBUG","badge":"ALL","timestamp":false,"colors":false}'
      )

      const log = new Logger({ configFile: file })
      expect(log.level).toBe('DEBUG')
      log.DEBUG('hello')
      expect(String(logSpy.mock.calls.at(-1)?.[0])).toBe('DEBUG    hello')

      expect(new Logger({ configFile: file, level: 'WARN' }).level).toBe('WARN')
      process.env['LOG_LEVEL'] = 'error'
      expect(new Logger({ configFile: file }).level).toBe('ERROR')
    })

    it('lets an explicit formatter win and supports disabling the file', () => {
      const file = write('m.json', '{"level":"DEBUG"}')
      expect(new Logger({ configFile: false }).level).toBe('INFO')
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      const log = new Logger({
        configFile: file,
        formatter: new PrettyFormatter({ colors: false, timestamp: false }),
      })
      log.INFO('x')
      expect(String(logSpy.mock.calls.at(-1)?.[0])).toBe('INFO     x')
    })

    it('merges redact keys from file and options', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      const file = write(
        'n.json',
        '{"redact":["fromFile"],"colors":false,"timestamp":false}'
      )
      new Logger({ configFile: file, redact: ['fromCode'] }).INFO('x', {
        fromFile: 1,
        fromCode: 2,
        ok: 3,
      })
      const line = String(logSpy.mock.calls.at(-1)?.[0])
      expect(line).toContain('"fromFile":"[REDACTED]"')
      expect(line).toContain('"fromCode":"[REDACTED]"')
      expect(line).toContain('"ok":3')
    })

    it('throws on an invalid explicit config file', () => {
      expect(
        () => new Logger({ configFile: write('o.json', '{"x":1}') })
      ).toThrow(TypeError)
    })
  })
})
