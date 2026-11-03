export declare function truncate(text: string, maxLength: number): string;
/** Escapes control characters so one log call can never forge extra log lines. */
export declare function escapeControlChars(input: string): string;
export declare function sanitizeText(input: string, maxLength: number): string;
export declare function normalizeScope(scope: unknown, maxLength?: number): string | undefined;
export declare function joinScope(parent: string | undefined, child: string | undefined): string | undefined;
/** Local time, 12-hour clock: `2026-11-03 10:15:30.123 AM`. */
export declare function formatTimestamp(date: Date): string;
//# sourceMappingURL=text.d.ts.map