// A tiny stand-in for Google's OAuth and Gmail endpoints, so the "Connect Gmail" flow can be tested end to end without a Google account.
// The app is started with GOOGLE_MOCK_ORIGIN pointing here (see playwright.config.ts). Never used outside the tests.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_GOOGLE_PORT ?? 3199);
const state = { expired: false, revoked: [], tokens: 0 };
const b64 = (s) => Buffer.from(s, "utf8").toString("base64url");
const header = (name, value) => ({ name, value });
const MAILS = {
  m1: { id: "m1", internalDate: String(Date.now() - 3_600_000), payload: { mimeType: "text/plain", headers: [header("From", '"Ada Lovelace" <ada@example.org>'), header("Subject", "Hello from Gmail"), header("Message-ID", "<m1@mock.test>")], body: { data: b64("Plain body line one.\n\nLine two.") } } },
  m2: { id: "m2", internalDate: String(Date.now() - 7_200_000), payload: { mimeType: "multipart/alternative", headers: [header("From", "news@example.org"), header("Subject", "HTML only"), header("Message-ID", "<m2@mock.test>")], parts: [{ mimeType: "text/html", body: { data: b64("<style>p{}</style><p>Only <b>html</b> here</p><script>alert(1)</script>") } }] } },
};

const readBody = (req) => new Promise((resolve) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => resolve(new URLSearchParams(d))); });
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/auth") { // the consent screen, approved at once
    const to = new URL(url.searchParams.get("redirect_uri"));
    to.searchParams.set("code", "GOOD"); to.searchParams.set("state", url.searchParams.get("state") ?? "");
    res.writeHead(302, { Location: to.toString() }); return res.end();
  }
  if (url.pathname === "/token" && req.method === "POST") {
    const f = await readBody(req);
    if (f.get("client_secret") !== "good-secret") return json(res, 401, { error: "invalid_client" });
    if (f.get("grant_type") === "authorization_code") return f.get("code") === "GOOD" ? json(res, 200, { access_token: "AT", refresh_token: `RT-secret-${++state.tokens}`, expires_in: 3600 }) : json(res, 400, { error: "invalid_grant" });
    if (f.get("grant_type") === "refresh_token") return state.expired || !String(f.get("refresh_token")).startsWith("RT-") ? json(res, 400, { error: "invalid_grant" }) : json(res, 200, { access_token: "AT", expires_in: 3600 });
  }
  if (url.pathname === "/userinfo") return json(res, 200, { email: "mock.owner@gmail.test" });
  if (url.pathname === "/revoke" && req.method === "POST") { state.revoked.push((await readBody(req)).get("token")); return json(res, 200, {}); }
  if (url.pathname.startsWith("/gmail/v1/users/me/messages")) {
    if (req.headers.authorization !== "Bearer AT") return json(res, 401, { error: { message: "no" } });
    const id = url.pathname.split("/")[6];
    return id ? json(res, 200, MAILS[id]) : json(res, 200, { messages: Object.keys(MAILS).map((k) => ({ id: k })) });
  }
  if (url.pathname === "/__expire") { state.expired = true; return json(res, 200, state); }
  if (url.pathname === "/__reset") { state.expired = false; state.revoked = []; return json(res, 200, state); }
  if (url.pathname === "/__state") return json(res, 200, state);
  json(res, 404, {});
}).listen(PORT, () => console.log(`mock google on ${PORT}`));
