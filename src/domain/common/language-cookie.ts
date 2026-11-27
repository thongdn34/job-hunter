import { LanguageModeSchema, type LanguageMode } from "./schema";

/**
 * Cookie mirroring the persisted language preference (written by `preferences-store`), read by the
 * root layout so the server renders the user's language mode. Isomorphic on purpose: a server
 * component cannot call helpers exported from a "use client" module.
 */
export const LANGUAGE_COOKIE = "jh-lang";

/** Validates a cookie/storage value; `null` when missing or not a known mode. */
export function parseLanguageMode(value: unknown): LanguageMode | null {
  const parsed = LanguageModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
