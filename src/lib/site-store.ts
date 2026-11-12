import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Theme } from "@/lib/enums";

/** Shared with the inline script in layout.tsx, which runs before React and can't import this. */
export const ENTRY_KEY = "entry-hash";

const session = {
  get: (key: string) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  },
  remove: (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  },
};

type SiteState = {
  /** The hero's load intro has finished. The nav and a section entry wait for it. */
  introDone: boolean;
  setIntroDone: (done: boolean) => void;

  /** Mirror of <html class="dark">; kept in sync by StoreSync. The class stays the source of truth for CSS. */
  theme: Theme;
  /** Theme swaps whose view transition is still running. While > 0 the page-navigation animation is off
   *  (StoreSync puts `theme-changing` on <html> for navigation.css). Counted so overlapping swaps can't
   *  switch it back on under each other. */
  themeSwaps: number;
  beginThemeSwap: () => void;
  endThemeSwap: () => void;

  /** Section the visitor asked to be taken to ("#work"): set by a direct load with a hash (layout.tsx's
   *  early script) or by a link (BackToWork), consumed by HashEntry. Mirrored in sessionStorage so it
   *  survives the reload that starts it. */
  entryHash: string | null;
  requestEntry: (hash: string) => void;
  clearEntry: () => void;

  /** Last scroll position per path, so Back returns to where you were. Persisted in sessionStorage. */
  scrollByPath: Record<string, number>;
  saveScroll: (path: string, y: number) => void;
};

export const useSiteStore = create<SiteState>()(
  persist(
    (set) => ({
      introDone: false,
      setIntroDone: (introDone) => set({ introDone }),

      // Always "light" at creation, on the server and on the client: it is also the hydration snapshot,
      // so the first client render matches the server HTML. StoreSync reads the real theme after mount.
      theme: Theme.Light,
      themeSwaps: 0,
      beginThemeSwap: () => set((s) => ({ themeSwaps: s.themeSwaps + 1 })),
      endThemeSwap: () => set((s) => ({ themeSwaps: Math.max(0, s.themeSwaps - 1) })),

      entryHash: typeof window === "undefined" ? null : session.get(ENTRY_KEY),
      requestEntry: (entryHash) => {
        session.set(ENTRY_KEY, entryHash);
        set({ entryHash });
      },
      clearEntry: () => {
        session.remove(ENTRY_KEY);
        set({ entryHash: null });
      },

      scrollByPath: {},
      // Returning the same state when nothing changed keeps subscribers and storage quiet.
      saveScroll: (path, y) => set((s) => (s.scrollByPath[path] === y ? s : { scrollByPath: { ...s.scrollByPath, [path]: y } })),
    }),
    {
      name: "site-scroll",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ scrollByPath: s.scrollByPath }),
    },
  ),
);

/** Run `cb` whenever the theme changes. Returns the unsubscribe. One store subscription replaces
 *  a MutationObserver per component. */
export const onThemeChange = (cb: () => void) =>
  useSiteStore.subscribe((s, prev) => {
    if (s.theme !== prev.theme) cb();
  });
