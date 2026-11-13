const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "14 Oct 2026". Fixed timezone and locale so server and browser print the same text. */
export const formatDate = (iso: string) => date.format(new Date(iso));

/** "engineering" -> "Engineering" */
export const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 12840 -> "12.8K" */
export const formatCount = (n: number) => compact.format(n);
