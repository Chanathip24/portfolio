import type { Instrumentation } from "next";

/** Next calls this for every error the server catches (rendering, route handlers, actions). */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordError } = await import("@/lib/errors");
  const error = err as { message?: string; stack?: string; digest?: string };
  await recordError({ source: "server", message: error.message ?? String(err), stack: error.stack, digest: error.digest, path: request.path });
};
