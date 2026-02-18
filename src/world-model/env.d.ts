/**
 * Ambient type declarations for browser APIs used with typeof guards.
 *
 * The world-model persistence layer checks `typeof localStorage !== 'undefined'`
 * before accessing it. This declaration tells TypeScript the symbol may exist
 * without pulling in the full DOM lib.
 */

declare const localStorage:
  | {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
      key(index: number): string | null;
      readonly length: number;
    }
  | undefined;
