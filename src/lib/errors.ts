/**
 * Narrow an unknown thrown value to a printable message.
 *
 * `catch` binds `unknown` under `useUnknownInCatchVariables` (part of `strict`).
 * Reaching for `(err as Error).message` compiles but prints the string
 * "undefined" whenever a non-Error is thrown — a rejected promise carrying a
 * string, or a `throw { code: 1 }`. Route every catch block through this.
 */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
