import test from "node:test";
import assert from "node:assert/strict";

import { buildConsultantReminderBatches } from "./consultant-reminder-recipients.ts";

test("buildConsultantReminderBatches groups cases by consultant owner", () => {
  const result = buildConsultantReminderBatches(
    [
      {
        id: "case-1",
        case_code: "CASE-1",
        client_name: "Client One",
        company_name: "Alpha Sdn Bhd",
        email: "client1@example.com",
        phone: "0123456789",
        status: "New",
        created_by: "consultant-1",
      },
      {
        id: "case-2",
        case_code: "CASE-2",
        client_name: "Client Two",
        company_name: "Beta Sdn Bhd",
        email: "client2@example.com",
        phone: "0198765432",
        status: "In Progress",
        created_by: "consultant-1",
      },
      {
        id: "case-3",
        case_code: "CASE-3",
        client_name: "Client Three",
        company_name: "Gamma Sdn Bhd",
        email: "client3@example.com",
        phone: null,
        status: "Under Review",
        created_by: "consultant-2",
      },
    ],
    [
      {
        id: "consultant-1",
        full_name: "Consultant One",
        email: "consultant1@example.com",
      },
      {
        id: "consultant-2",
        full_name: "Consultant Two",
        email: "consultant2@example.com",
      },
    ]
  );

  assert.equal(result.batches.length, 2);
  assert.deepEqual(result.skippedCases, []);
  assert.deepEqual(
    result.batches.map((batch) => ({
      consultantId: batch.consultantId,
      consultantEmail: batch.consultantEmail,
      caseIds: batch.cases.map((item) => item.id),
    })),
    [
      {
        consultantId: "consultant-1",
        consultantEmail: "consultant1@example.com",
        caseIds: ["case-1", "case-2"],
      },
      {
        consultantId: "consultant-2",
        consultantEmail: "consultant2@example.com",
        caseIds: ["case-3"],
      },
    ]
  );
});

test("buildConsultantReminderBatches skips cases without a consultant email", () => {
  const result = buildConsultantReminderBatches(
    [
      {
        id: "case-1",
        case_code: "CASE-1",
        client_name: "Client One",
        company_name: "Alpha Sdn Bhd",
        email: "client1@example.com",
        phone: "0123456789",
        status: "New",
        created_by: "consultant-1",
      },
      {
        id: "case-2",
        case_code: "CASE-2",
        client_name: "Client Two",
        company_name: "Beta Sdn Bhd",
        email: "client2@example.com",
        phone: "0198765432",
        status: "New",
        created_by: "consultant-2",
      },
    ],
    [
      {
        id: "consultant-1",
        full_name: "Consultant One",
        email: "consultant1@example.com",
      },
      {
        id: "consultant-2",
        full_name: "Consultant Two",
        email: null,
      },
    ]
  );

  assert.equal(result.batches.length, 1);
  assert.equal(result.batches[0]?.consultantId, "consultant-1");
  assert.deepEqual(result.skippedCases, [
    {
      caseId: "case-2",
      createdBy: "consultant-2",
      reason: "missing-consultant-email",
    },
  ]);
});
