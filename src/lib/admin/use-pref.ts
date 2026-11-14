"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// A setting kept in the browser (rows per page, sort order, visible columns). It is also held in memory, so it still
// works when localStorage is blocked, and every table showing the same setting updates together.
const memory = new Map<string, string>();
const EVENT = "admin-pref";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener(EVENT, cb); };
};

/** Like useState, but remembered. `fallback` must be a stable value (a constant), not a fresh object each render. */
export function usePref<T>(key: string, fallback: T): [T, (value: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => { try { return memory.get(key) ?? localStorage.getItem(key); } catch { return memory.get(key) ?? null; } },
    () => null, // the server and the first render use the fallback, so nothing mismatches
  );
  const value = useMemo(() => { try { return raw === null ? fallback : (JSON.parse(raw) as T); } catch { return fallback; } }, [raw, fallback]);
  const set = useCallback((next: T) => {
    const text = JSON.stringify(next);
    memory.set(key, text);
    try { localStorage.setItem(key, text); } catch { /* blocked: the in-memory copy still applies for this visit */ }
    window.dispatchEvent(new Event(EVENT));
  }, [key]);
  return [value, set];
}
