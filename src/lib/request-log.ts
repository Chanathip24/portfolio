import "server-only";

type Handler<R extends Request, C> = (req: R, ctx: C) => Promise<Response>;

/** Wraps a route handler so every request writes one JSON line: path, method, status, duration and any `extra` fields.
 *  Only the path is logged (no query string, headers, body or address), so nothing a visitor typed or sent ends up in the logs. */
export function withRequestLog<R extends Request, C>(handler: Handler<R, C>, extra: Record<string, string> = {}): Handler<R, C> {
  return async (req, ctx) => {
    const start = performance.now(); // performance, not Date: measuring time is not reading the clock for output
    let status = 500; // what a thrown error becomes
    try {
      const res = await handler(req, ctx);
      status = res.status;
      return res;
    } finally {
      const route = new URL(req.url).pathname.slice(0, 200);
      console.log(JSON.stringify({ type: "request", route, method: req.method, status, durationMs: Math.round(performance.now() - start), ...extra }));
    }
  };
}
