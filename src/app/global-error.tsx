"use client";

/** The last resort: the root layout itself failed, so this brings its own <html> and plain styles. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, minHeight: "100svh", display: "grid", placeItems: "center", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ maxWidth: 440, padding: 24 }}>
          <h1 style={{ fontSize: 32, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "#475569", margin: "0 0 24px" }}>The site could not load. Try again in a moment.</p>
          <button type="button" onClick={reset} style={{ border: 0, borderRadius: 999, padding: "10px 20px", background: "#0f172a", color: "#fff", cursor: "pointer" }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
