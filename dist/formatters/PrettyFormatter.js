import { LEVEL_NAMES } from '../levels.js';
import { stringify } from '../utils/serialize.js';
import { resolveTimestamp, } from '../utils/text.js';
import { Chalk } from 'chalk';
const TEXT_STYLES = {
    DEBUG: (c) => c.white,
    INFO: (c) => c.cyan,
    SUCCESS: (c) => c.green,
    WARN: (c) => c.yellow,
    ERROR: (c) => c.bold.red,
    FATAL: (c) => c.bold.black.bgRed,
};
const BADGE_STYLES = {
    DEBUG: (c) => c.bold.black.bgWhiteBright,
    INFO: (c) => c.bold.black.bgCyan,
    SUCCESS: (c) => c.bold.black.bgGreen,
    WARN: (c) => c.bold.black.bgYellow,
    ERROR: (c) => c.bold.black.bgRed,
    FATAL: (c) => c.bold.black.bgRed,
};
const PRESETS = {
    text: TEXT_STYLES,
    badge: BADGE_STYLES,
    hybrid: {
        ...TEXT_STYLES,
        WARN: BADGE_STYLES.WARN,
        ERROR: BADGE_STYLES.ERROR,
        FATAL: BADGE_STYLES.FATAL,
    },
};
const LEVEL_PAD = Math.max(...LEVEL_NAMES.map((name) => name.length));
const MAX_CAUSE_DEPTH = 10;
const INDENT = '    ';
function resolveChalk(colors, env = process.env) {
    if (colors === false)
        return new Chalk({ level: 0 });
    if (colors === true) {
        const detected = new Chalk().level;
        return new Chalk({
            level: (detected > 0 ? detected : 1),
        });
    }
    const noColor = env['NO_COLOR'] !== undefined && env['NO_COLOR'] !== '';
    const forced = env['FORCE_COLOR'] !== undefined && env['FORCE_COLOR'] !== '';
    return noColor && !forced ? new Chalk({ level: 0 }) : new Chalk();
}
function isErrorLike(value) {
    return (typeof value === 'object' &&
        value !== null &&
        typeof value.name === 'string' &&
        typeof value.message === 'string');
}
/**
 * Standard human-readable format:
 *   2026-11-03 10:15:30.123 AM  WARN     [auth]  Login failed  {"userId":42}
 */
export class PrettyFormatter {
    #chalk;
    #styles;
    #timestamp;
    constructor(options = {}) {
        const c = (this.#chalk = resolveChalk(options.colors));
        const preset = options.levelStyle ?? 'text';
        if (!Object.hasOwn(PRESETS, preset)) {
            throw new TypeError(`Invalid levelStyle "${String(preset)}". Expected "text", "badge" or "hybrid".`);
        }
        const base = PRESETS[preset];
        const overrides = options.styles ?? {};
        const styles = {};
        for (const level of LEVEL_NAMES) {
            const fn = overrides[level] ?? base[level];
            if (typeof fn !== 'function')
                throw new TypeError(`styles.${level} must be a function.`);
            styles[level] = fn(c);
        }
        this.#styles = styles;
        this.#timestamp = resolveTimestamp(options.timestamp);
    }
    format(record) {
        const c = this.#chalk;
        const parts = [];
        if (this.#timestamp)
            parts.push(c.dim(this.#timestamp(record.timestamp)));
        parts.push(this.#styles[record.level](record.level.padEnd(LEVEL_PAD)));
        if (record.scope)
            parts.push(c.magenta(`[${record.scope}]`));
        parts.push(record.message);
        if (record.meta !== undefined)
            parts.push(c.dim(stringify(record.meta)));
        let line = parts.join('  ');
        if (record.error)
            line += `\n${this.#renderError(record.error, 0)}`;
        return line;
    }
    #renderError(error, depth) {
        const c = this.#chalk;
        const { name, message, stack, cause, ...rest } = error;
        const head = typeof stack === 'string' && stack.length > 0
            ? stack
            : `${name}: ${message}`;
        const lines = head.split('\n').map((l) => c.red(`${INDENT}${l}`));
        if (Object.keys(rest).length > 0)
            lines.push(c.dim(`${INDENT}${stringify(rest)}`));
        if (cause !== undefined) {
            if (isErrorLike(cause) && depth < MAX_CAUSE_DEPTH) {
                lines.push(c.red(`${INDENT}Caused by:`), this.#renderError(cause, depth + 1));
            }
            else {
                lines.push(c.red(`${INDENT}Caused by: ${stringify(cause)}`));
            }
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=PrettyFormatter.js.map