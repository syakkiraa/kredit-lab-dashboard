import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConsultantReminderSchedule,
  wasSentOnKualaLumpurDate,
} from "./consultant-reminder-schedule.ts";

test("allows sends during the 09:00 Kuala Lumpur hour", () => {
  const schedule = buildConsultantReminderSchedule(
    new Date("2026-06-15T01:05:00.000Z")
  );

  assert.equal(schedule.shouldSendNow, true);
});

test("blocks sends outside the 09:00 Kuala Lumpur hour", () => {
  const schedule = buildConsultantReminderSchedule(
    new Date("2026-06-15T00:59:00.000Z")
  );

  assert.equal(schedule.shouldSendNow, false);
});

test("tracks the current Kuala Lumpur date key and daily window boundary", () => {
  const schedule = buildConsultantReminderSchedule(
    new Date("2026-06-15T01:05:00.000Z")
  );

  assert.equal(schedule.localDateKey, "2026-06-15");
  assert.equal(schedule.startOfLocalDayUtcIso, "2026-06-14T16:00:00.000Z");
  assert.equal(schedule.createdBeforeUtcIso, "2026-06-14T01:05:00.000Z");
});

test("detects sends that already happened on the current Kuala Lumpur day", () => {
  assert.equal(
    wasSentOnKualaLumpurDate("2026-06-15T01:30:00.000Z", "2026-06-15"),
    true
  );
  assert.equal(
    wasSentOnKualaLumpurDate("2026-06-14T15:30:00.000Z", "2026-06-15"),
    false
  );
  assert.equal(wasSentOnKualaLumpurDate(null, "2026-06-15"), false);
});
