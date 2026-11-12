/** 4x4 ordered-dither thresholds, 0..1. Shared by every canvas that dithers. */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => (n + 0.5) / 16);

/** The site's default "arrive and settle" curve (ease-out-expo-ish) for Motion transitions. */
export const EASE = [0.16, 1, 0.3, 1] as const;
