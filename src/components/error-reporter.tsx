"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/** Reports errors no boundary caught (a failed event handler, an unhandled promise). Render errors reach error.tsx instead. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
