import { useSyncExternalStore } from "react";

export type Consent = "accepted" | "declined";
const KEY = "analytics-consent";
const listeners = new Set<() => void>();

/** The visitor's choice, or null if they have not made one. "declined" is an opt-out of all measurement; Do Not Track counts as one. */
export function readConsent(): Consent | null {
  if (navigator.doNotTrack === "1") return "declined";
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent | null) {
  try {
    if (value) localStorage.setItem(KEY, value); else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
};

/** Measurement is on unless the visitor opted out: it is cookieless and anonymous, so it needs a notice and an opt-out, not an opt-in. */
export const trackingAllowed = () => readConsent() !== "declined";

/** The choice as React state. `undefined` on the server and during hydration, so nothing flashes. */
export const useConsent = (): Consent | null | undefined => useSyncExternalStore(subscribe, readConsent, () => undefined);
