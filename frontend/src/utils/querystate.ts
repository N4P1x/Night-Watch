import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/** String state mirrored to a URL query param — filtered views stay shareable. */
export function useQueryState(key: string, initial = ''): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? initial;
  const set = useCallback(
    (v: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v) next.set(key, v);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [key, setParams],
  );
  return [value, set];
}

/** Page-number state mirrored to ?p= (1-based in URL, 0-based in code). */
export function useQueryPage(key = 'p'): [number, (v: number) => void] {
  const [raw, setRaw] = useQueryState(key, '');
  const page = Math.max(0, (parseInt(raw, 10) || 1) - 1);
  const set = useCallback((v: number) => setRaw(v <= 0 ? '' : String(v + 1)), [setRaw]);
  return [page, set];
}
