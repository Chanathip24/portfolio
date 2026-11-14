import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false while rendering on the server and during hydration, true in the browser after. For text that depends on the visitor's own timezone. */
export const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);
