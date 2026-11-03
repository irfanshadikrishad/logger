import { REDACTED, type Redactor } from "@/utils/redact.js";
import { truncate } from "@/utils/text.js";

export interface NormalizeOptions {
  readonly maxDepth: number;
  readonly maxItems: number;
  readonly maxStringLength: number;
  readonly isSensitiveKey: Redactor;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
  [key: string]: unknown;
}

type Ancestors = Set<object>;

/**
 * Converts any value into a JSON-safe structure:
 * circular refs, BigInt, Symbol, functions, Error, Date, Map, Set, binary data,
 * throwing getters, depth/size limits and key redaction are all handled.
 * Never throws.
 */
export function normalize(value: unknown, options: NormalizeOptions): unknown {
  try {
    return walk(value, 0, new Set(), options);
  } catch {
    return "[Unserializable]";
  }
}

export function serializeError(
  error: Error,
  options: NormalizeOptions,
): SerializedError {
  try {
    return walkError(error, 0, new Set([error]), options);
  } catch {
    return { name: "Error", message: "[Unserializable error]" };
  }
}

/** `JSON.stringify` that cannot throw. */
export function stringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "undefined";
  } catch {
    return "[Unserializable]";
  }
}

function walk(
  value: unknown,
  depth: number,
  ancestors: Ancestors,
  opts: NormalizeOptions,
): unknown {
  switch (typeof value) {
    case "string":
      return truncate(value, opts.maxStringLength);
    case "number":
      return Number.isFinite(value) ? value : String(value);
    case "boolean":
    case "undefined":
      return value;
    case "bigint":
      return `${value}n`;
    case "symbol":
      return value.toString();
    case "function":
      return `[Function ${value.name || "anonymous"}]`;
    default:
      break;
  }
  if (value === null) return null;

  const obj = value as object;
  if (ancestors.has(obj)) return "[Circular]";
  if (depth >= opts.maxDepth) return "[MaxDepth]";

  ancestors.add(obj);
  try {
    if (obj instanceof Date)
      return Number.isNaN(obj.getTime()) ? "Invalid Date" : obj.toISOString();
    if (obj instanceof Error) return walkError(obj, depth, ancestors, opts);
    if (ArrayBuffer.isView(obj))
      return `[${obj.constructor.name} ${obj.byteLength} bytes]`;
    if (obj instanceof ArrayBuffer)
      return `[ArrayBuffer ${obj.byteLength} bytes]`;
    if (obj instanceof Map)
      return walkList(Array.from(obj.entries()), depth, ancestors, opts);
    if (obj instanceof Set)
      return walkList(Array.from(obj.values()), depth, ancestors, opts);
    if (Array.isArray(obj)) return walkList(obj, depth, ancestors, opts);

    const toJSON = (obj as { toJSON?: unknown }).toJSON;
    if (typeof toJSON === "function") {
      return walk(toJSON.call(obj), depth + 1, ancestors, opts);
    }
    return walkObject(obj as Record<string, unknown>, depth, ancestors, opts);
  } catch {
    return "[Unserializable]";
  } finally {
    ancestors.delete(obj);
  }
}

function walkList(
  list: readonly unknown[],
  depth: number,
  ancestors: Ancestors,
  opts: NormalizeOptions,
): unknown[] {
  const length = Math.min(list.length, opts.maxItems);
  const out: unknown[] = [];
  for (let i = 0; i < length; i++) {
    try {
      out.push(walk(list[i], depth + 1, ancestors, opts));
    } catch {
      out.push("[Unreadable]");
    }
  }
  if (list.length > length) out.push(`[+${list.length - length} more]`);
  return out;
}

function walkObject(
  obj: Record<string, unknown>,
  depth: number,
  ancestors: Ancestors,
  opts: NormalizeOptions,
): Record<string, unknown> {
  // Null prototype: a hostile `__proto__` key becomes plain data, never a prototype swap.
  const out = Object.create(null) as Record<string, unknown>;
  const keys = Object.keys(obj);
  const limit = Math.min(keys.length, opts.maxItems);
  for (let i = 0; i < limit; i++) {
    const key = keys[i] as string;
    if (opts.isSensitiveKey(key)) {
      out[key] = REDACTED;
      continue;
    }
    try {
      out[key] = walk(obj[key], depth + 1, ancestors, opts);
    } catch {
      out[key] = "[Unreadable]";
    }
  }
  if (keys.length > limit)
    out["[truncated]"] = `+${keys.length - limit} more keys`;
  return out;
}

const ERROR_CORE_KEYS = new Set([
  "name",
  "message",
  "stack",
  "cause",
  "errors",
]);

function walkError(
  error: Error,
  depth: number,
  ancestors: Ancestors,
  opts: NormalizeOptions,
): SerializedError {
  const out = Object.create(null) as SerializedError;
  out.name = typeof error.name === "string" ? error.name : "Error";
  out.message =
    typeof error.message === "string"
      ? truncate(error.message, opts.maxStringLength)
      : "";
  if (typeof error.stack === "string")
    out.stack = truncate(error.stack, opts.maxStringLength);
  if (error.cause !== undefined)
    out.cause = walk(error.cause, depth + 1, ancestors, opts);
  if (error instanceof AggregateError)
    out.errors = walk(error.errors, depth + 1, ancestors, opts);

  for (const key of Object.keys(error)) {
    if (ERROR_CORE_KEYS.has(key)) continue;
    if (opts.isSensitiveKey(key)) {
      out[key] = REDACTED;
      continue;
    }
    try {
      out[key] = walk(
        (error as unknown as Record<string, unknown>)[key],
        depth + 1,
        ancestors,
        opts,
      );
    } catch {
      out[key] = "[Unreadable]";
    }
  }
  return out;
}
