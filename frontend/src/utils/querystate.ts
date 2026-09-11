import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * URL-synced filter state with ONE atomic writer.
 *
 * React Router navigations do not chain: two setParams calls in one handler
 * each capture the current location, and the last navigation silently
 * discards the first. So every interaction — filter change AND page reset —
 * must commit in a single setParams call. Never call the updater twice per
 * gesture; always fold everything into one patch object.
 */
export function useQueryParams(): [
  URLSearchParams,
  (patch: Record<string, string | null | undefined>) => void,
] {
  const [params, setParams] = useSearchParams();
  const update = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [params, update];
}

/** 0-based page number backed by ?p= (1-based in the URL, absent = first). */
export function pageFromParams(params: URLSearchParams): number {
  return Math.max(0, (parseInt(params.get('p') ?? '', 10) || 1) - 1);
}

/** Patch fragment that moves to 0-based page n (?p= omitted on first). */
export function pagePatch(n: number): Record<string, string | null> {
  return { p: n <= 0 ? null : String(n + 1) };
}
