export type ConsultantReminderCase = {
  id: string;
  case_code: string | null;
  client_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  created_by: string | null;
};

export type ConsultantProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type ConsultantReminderBatch = {
  consultantId: string;
  consultantName: string;
  consultantEmail: string;
  cases: ConsultantReminderCase[];
};

export type SkippedConsultantReminderCase = {
  caseId: string;
  createdBy: string | null;
  reason: "missing-consultant-owner" | "missing-consultant-email";
};

export function buildConsultantReminderBatches(
  cases: ConsultantReminderCase[],
  profiles: ConsultantProfile[]
): {
  batches: ConsultantReminderBatch[];
  skippedCases: SkippedConsultantReminderCase[];
} {
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile] as const)
  );
  const batchesByConsultantId = new Map<string, ConsultantReminderBatch>();
  const skippedCases: SkippedConsultantReminderCase[] = [];

  for (const item of cases) {
    if (!item.created_by) {
      skippedCases.push({
        caseId: item.id,
        createdBy: item.created_by,
        reason: "missing-consultant-owner",
      });
      continue;
    }

    const profile = profilesById.get(item.created_by);
    const consultantEmail = profile?.email?.trim();

    if (!consultantEmail) {
      skippedCases.push({
        caseId: item.id,
        createdBy: item.created_by,
        reason: "missing-consultant-email",
      });
      continue;
    }

    const existingBatch = batchesByConsultantId.get(item.created_by);

    if (existingBatch) {
      existingBatch.cases.push(item);
      continue;
    }

    batchesByConsultantId.set(item.created_by, {
      consultantId: item.created_by,
      consultantName: profile?.full_name?.trim() || consultantEmail,
      consultantEmail,
      cases: [item],
    });
  }

  return {
    batches: [...batchesByConsultantId.values()],
    skippedCases,
  };
}
