import { expect, test } from "@playwright/test";
import { addDays, isTimeZone, siteDay, siteDayStart } from "../../src/lib/tz";
import { service } from "../support/db";

// The admin counts days in a time zone it can be told, not in UTC.
test.describe("time zone", () => {
  test("a day starts at the right instant, and an instant belongs to the right day", () => {
    expect(siteDayStart("2026-11-15", "Asia/Bangkok")).toBe("2026-11-14T17:00:00.000Z");
    expect(siteDay(Date.parse("2026-11-14T18:30:00Z"), "Asia/Bangkok")).toBe("2026-11-15"); // 01:30 the next morning in Bangkok
    expect(siteDay(Date.parse("2026-11-14T16:59:00Z"), "Asia/Bangkok")).toBe("2026-11-14");
    expect(siteDay(Date.parse("2026-11-14T18:30:00Z"), "UTC")).toBe("2026-11-14");
    expect(siteDay(Date.parse("2026-11-14T18:30:00Z"), "America/New_York")).toBe("2026-11-14");
  });

  test("a day that starts across a clock change still starts at local midnight", () => {
    // New York clocks go forward on 8 March 2026: midnight is UTC-5 before it and UTC-4 after it.
    expect(siteDayStart("2026-03-08", "America/New_York")).toBe("2026-03-08T05:00:00.000Z");
    expect(siteDayStart("2026-03-09", "America/New_York")).toBe("2026-03-09T04:00:00.000Z");
  });

  test("calendar day arithmetic ignores the time zone", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  test("only real zones are accepted", () => {
    for (const ok of ["UTC", "Asia/Bangkok", "America/New_York"]) expect(isTimeZone(ok)).toBe(true);
    for (const bad of ["", "Mars/Olympus", "bangkok", "'; drop table posts; --", 7, null, undefined]) expect(isTimeZone(bad)).toBe(false);
  });

  test("a view at 18:30 UTC is counted on the next day in Bangkok and on the same day in UTC", async () => {
    const slug = `/blog/e2e-tz-${Date.now()}`;
    const utcDay = addDays(new Date().toISOString().slice(0, 10), -3);
    await service().from("page_views").insert({ path: slug, visitor: "e2e-tz", created_at: `${utcDay}T18:30:00Z` });
    try {
      const busyDay = async (tz: string) => {
        const { data } = await service().rpc("section_analytics", { p_prefix: "/blog/", p_path: slug, days: 10, p_tz: tz });
        return (data.daily as { day: string; views: number }[]).find((d) => d.views === 1)?.day;
      };
      expect(await busyDay("UTC")).toBe(utcDay);
      expect(await busyDay("Asia/Bangkok")).toBe(addDays(utcDay, 1));
    } finally {
      await service().from("page_views").delete().eq("visitor", "e2e-tz");
    }
  });
});
