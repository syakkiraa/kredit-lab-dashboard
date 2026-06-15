# Consultant Daily Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make consultant reminders send only during the 09:00 hour in `Asia/Kuala_Lumpur`, repeat once per day per eligible case, and only after the case is at least one day old.

**Architecture:** Extract Kuala Lumpur scheduling rules into a small pure helper so time-window logic is testable without external services. Keep the API route responsible for auth, fetching candidate cases, filtering out cases already sent today, sending with Resend, and updating the send timestamp.

**Tech Stack:** Next.js route handlers, TypeScript, Supabase, Resend, Node native test runner

---

### Task 1: Add schedule helper tests

**Files:**
- Create: `lib/consultant-reminder-schedule.test.ts`
- Test: `lib/consultant-reminder-schedule.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConsultantReminderSchedule,
  wasSentOnKualaLumpurDate,
} from "./consultant-reminder-schedule";

test("allows sends during the 09:00 Kuala Lumpur hour", () => {
  const schedule = buildConsultantReminderSchedule(
    new Date("2026-06-15T01:05:00.000Z")
  );

  assert.equal(schedule.shouldSendNow, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/consultant-reminder-schedule.test.ts`
Expected: FAIL because `./consultant-reminder-schedule` does not exist yet

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildConsultantReminderSchedule(now: Date) {
  return { shouldSendNow: true };
}

export function wasSentOnKualaLumpurDate() {
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/consultant-reminder-schedule.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/consultant-reminder-schedule.test.ts lib/consultant-reminder-schedule.ts
git commit -m "test: add consultant reminder scheduling coverage"
```

### Task 2: Implement Kuala Lumpur daily reminder rules

**Files:**
- Create: `lib/consultant-reminder-schedule.ts`
- Modify: `app/api/send-case-email/send-consultant-reminders/route.ts`
- Test: `lib/consultant-reminder-schedule.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("blocks sends outside the 09:00 Kuala Lumpur hour", () => {
  const schedule = buildConsultantReminderSchedule(
    new Date("2026-06-15T00:59:00.000Z")
  );

  assert.equal(schedule.shouldSendNow, false);
});

test("tracks the current Kuala Lumpur date key", () => {
  const schedule = buildConsultantReminderSchedule(
    new Date("2026-06-15T01:05:00.000Z")
  );

  assert.equal(schedule.localDateKey, "2026-06-15");
  assert.equal(schedule.startOfLocalDayUtcIso, "2026-06-14T16:00:00.000Z");
});

test("detects sends that already happened on the current Kuala Lumpur day", () => {
  assert.equal(
    wasSentOnKualaLumpurDate("2026-06-15T01:30:00.000Z", "2026-06-15"),
    true
  );
  assert.equal(
    wasSentOnKualaLumpurDate("2026-06-14T23:30:00.000Z", "2026-06-15"),
    false
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/consultant-reminder-schedule.test.ts`
Expected: FAIL on missing properties or wrong return values

- [ ] **Step 3: Write minimal implementation**

```ts
const TIME_ZONE = "Asia/Kuala_Lumpur";

export function buildConsultantReminderSchedule(now: Date) {
  const parts = getLocalParts(now, TIME_ZONE);
  return {
    shouldSendNow: parts.hour === 9,
    localDateKey: `${parts.year}-${parts.month}-${parts.day}`,
    startOfLocalDayUtcIso: new Date(
      Date.UTC(parts.year, parts.monthIndex, parts.dayNumber, -8, 0, 0, 0)
    ).toISOString(),
    createdBeforeUtcIso: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function wasSentOnKualaLumpurDate(sentAt: string | null, localDateKey: string) {
  if (!sentAt) return false;
  const parts = getLocalParts(new Date(sentAt), TIME_ZONE);
  return `${parts.year}-${parts.month}-${parts.day}` === localDateKey;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/consultant-reminder-schedule.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/consultant-reminder-schedule.ts lib/consultant-reminder-schedule.test.ts app/api/send-case-email/send-consultant-reminders/route.ts
git commit -m "feat: send consultant reminders once per Kuala Lumpur day"
```

### Task 3: Patch the reminder route

**Files:**
- Modify: `app/api/send-case-email/send-consultant-reminders/route.ts`
- Test: `lib/consultant-reminder-schedule.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("exposes a daily cutoff for cases older than one day", () => {
  const schedule = buildConsultantReminderSchedule(
    new Date("2026-06-15T01:05:00.000Z")
  );

  assert.equal(schedule.createdBeforeUtcIso, "2026-06-14T01:05:00.000Z");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/consultant-reminder-schedule.test.ts`
Expected: FAIL until the helper exposes the exact cutoff value

- [ ] **Step 3: Write minimal implementation**

```ts
const schedule = buildConsultantReminderSchedule(new Date());

if (!schedule.shouldSendNow) {
  return Response.json({
    success: true,
    message: "Outside consultant reminder window",
  });
}

const { data: cases } = await supabaseAdmin
  .from("cases")
  .select("id, case_code, client_name, company_name, email, phone, status, created_at, consultant_reminder_sent_at")
  .lte("created_at", schedule.createdBeforeUtcIso)
  .not("email", "is", null);

const eligibleCases =
  cases?.filter(
    (item) =>
      !wasSentOnKualaLumpurDate(
        item.consultant_reminder_sent_at,
        schedule.localDateKey
      )
  ) ?? [];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/consultant-reminder-schedule.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/send-case-email/send-consultant-reminders/route.ts lib/consultant-reminder-schedule.ts lib/consultant-reminder-schedule.test.ts
git commit -m "feat: gate consultant reminders to the Kuala Lumpur morning window"
```
