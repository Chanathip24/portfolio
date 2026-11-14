import { expect, test } from "@playwright/test";
import { hasRecentMfa, readTrustedIp } from "../../src/lib/request-policy";

test("untrusted forwarded headers cannot choose a visitor's network identity", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.5" });
  expect(readTrustedIp(headers)).toBe("");
  expect(readTrustedIp(headers, "x-real-ip")).toBe("198.51.100.5");
  expect(readTrustedIp(new Headers({ "x-real-ip": "made-up" }), "x-real-ip")).toBe("");
});

test("refreshing a password session does not satisfy recent MFA", () => {
  const now = 10_000;
  expect(hasRecentMfa([{ method: "password", timestamp: now }], now)).toBe(false);
  expect(hasRecentMfa([{ method: "totp", timestamp: now - 901 }], now)).toBe(false);
  expect(hasRecentMfa([{ method: "totp", timestamp: now + 10 }], now)).toBe(false);
  expect(hasRecentMfa([{ method: "totp", timestamp: now - 60 }], now)).toBe(true);
  expect(hasRecentMfa([], now)).toBe(false);
});
