import { describe, expect, it } from "@jest/globals";
import { createRedactor } from "@/index.js";
import {
  normalize,
  stringify,
  type NormalizeOptions,
} from "@/utils/serialize.js";

const opts = (over: Partial<NormalizeOptions> = {}): NormalizeOptions => ({
  maxDepth: 6,
  maxItems: 100,
  maxStringLength: 1000,
  isSensitiveKey: createRedactor(),
  ...over,
});

describe("normalize", () => {
  it("handles special types", () => {
    const out = normalize(
      {
        d: new Date(Date.UTC(2026, 0, 1)),
        m: new Map([["a", 1]]),
        s: new Set([1]),
        f() {},
        sym: Symbol("x"),
        n: NaN,
      },
      opts(),
    );
    expect(stringify(out)).toBe(
      '{"d":"2026-01-01T00:00:00.000Z","m":[["a",1]],"s":[1],"f":"[Function f]","sym":"Symbol(x)","n":"NaN"}',
    );
  });

  it("limits depth, items and string length", () => {
    expect(
      stringify(normalize({ a: { b: { c: 1 } } }, opts({ maxDepth: 2 }))),
    ).toBe('{"a":{"b":"[MaxDepth]"}}');
    expect(stringify(normalize([1, 2, 3, 4], opts({ maxItems: 2 })))).toBe(
      '[1,2,"[+2 more]"]',
    );
    expect(normalize("x".repeat(50), opts({ maxStringLength: 10 }))).toBe(
      `${"x".repeat(10)}…[truncated]`,
    );
  });

  it("survives throwing getters and toJSON", () => {
    const evil = {
      get boom(): never {
        throw new Error("nope");
      },
      ok: 1,
    };
    Object.defineProperty(evil, "boom", {
      enumerable: true,
      get: () => {
        throw new Error("nope");
      },
    });
    expect(stringify(normalize(evil, opts()))).toBe(
      '{"boom":"[Unreadable]","ok":1}',
    );
    const badJson = {
      toJSON: () => {
        throw new Error("x");
      },
    };
    expect(normalize(badJson, opts())).toBe("[Unserializable]");
  });

  it("does not allow prototype pollution via __proto__ keys", () => {
    const hostile = JSON.parse('{"__proto__":{"polluted":true}}') as unknown;
    const out = normalize(hostile, opts()) as Record<string, unknown>;
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
    expect(Object.getPrototypeOf(out)).toBeNull();
    expect(stringify(out)).toContain("__proto__");
  });

  it("keeps repeated (non-circular) references", () => {
    const shared = { x: 1 };
    expect(stringify(normalize({ a: shared, b: shared }, opts()))).toBe(
      '{"a":{"x":1},"b":{"x":1}}',
    );
  });
});
