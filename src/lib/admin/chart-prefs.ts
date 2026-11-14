"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = { hidden: string[]; hide: (id: string) => void; show: (id: string) => void; showAll: (ids: string[]) => void };

/** Which charts the admin has hidden, remembered in this browser. `skipHydration` keeps the first client render equal to the
 *  server's (every chart shown); <ChartPrefsHydrator> then loads the saved choice. */
export const useChartPrefs = create<State>()(persist(
  (set) => ({
    hidden: [],
    hide: (id) => set((s) => (s.hidden.includes(id) ? s : { hidden: [...s.hidden, id] })),
    show: (id) => set((s) => ({ hidden: s.hidden.filter((h) => h !== id) })),
    showAll: (ids) => set((s) => ({ hidden: s.hidden.filter((h) => !ids.includes(h)) })),
  }),
  { name: "admin:hidden-charts", skipHydration: true, partialize: (s) => ({ hidden: s.hidden }) },
));
