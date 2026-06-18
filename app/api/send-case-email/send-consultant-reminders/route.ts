import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import {
  buildConsultantReminderSchedule,
  wasSentOnKualaLumpurDate,
} from "@/lib/consultant-reminder-schedule";
import { buildConsultantReminderBatches } from "@/lib/consultant-reminder-recipients";

export async function GET() {
  return Response.json({
    success: true,
    message: "Consultant reminder route exists. Use POST to send reminders.",
  });
}

export async function POST(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return Response.json(
        { error: "CRON_SECRET is missing" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");

    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !resendApiKey ||
      !supabaseUrl ||
      !supabaseServiceRoleKey
    ) {
      return Response.json(
        {
          error: "Missing environment variables",
          hasResendApiKey: !!resendApiKey,
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
        },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const schedule = buildConsultantReminderSchedule(new Date());

    if (!schedule.shouldSendNow) {
      return Response.json({
        success: true,
        message: "Outside consultant reminder window",
        timeZone: "Asia/Kuala_Lumpur",
        localDate: schedule.localDateKey,
        sent: 0,
      });
    }

    const { data: cases, error: fetchError } = await supabaseAdmin
        .from("cases")
      .select(
        "id, case_code, client_name, company_name, email, phone, status, created_at, created_by, consultant_reminder_sent_at"
      )
      .lte("created_at", schedule.createdBeforeUtcIso)
      .not("email", "is", null);

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    const eligibleCases =
      cases?.filter(
        (item) =>
          !wasSentOnKualaLumpurDate(
            item.consultant_reminder_sent_at,
            schedule.localDateKey
          )
      ) || [];

    const consultantIds = [
      ...new Set(
        eligibleCases
          .map((item) => item.created_by)
          .filter((createdBy): createdBy is string => Boolean(createdBy))
      ),
    ];

    const { data: consultantProfiles, error: profilesError } =
      consultantIds.length === 0
        ? { data: [], error: null }
        : await supabaseAdmin
            .from("profiles")
            .select("id, full_name, email")
            .in("id", consultantIds);

    if (profilesError) {
      return Response.json({ error: profilesError.message }, { status: 500 });
    }

    const { batches, skippedCases } = buildConsultantReminderBatches(
      eligibleCases,
      consultantProfiles || []
    );

    if (eligibleCases.length === 0) {
      return Response.json({
        success: true,
        message: "No consultant reminders to send",
        cutoff: schedule.createdBeforeUtcIso,
        localDate: schedule.localDateKey,
        foundCases: cases?.length || 0,
        eligibleCases: 0,
        skippedCases: 0,
        sentEmails: 0,
        sent: 0,
      });
    }

    if (batches.length === 0) {
      return Response.json({
        success: true,
        message: "No consultant reminders with valid recipients",
        cutoff: schedule.createdBeforeUtcIso,
        localDate: schedule.localDateKey,
        foundCases: cases.length,
        eligibleCases: eligibleCases.length,
        skippedCases,
        sentEmails: 0,
        sent: 0,
      });
    }

    let sentCount = 0;
    let sentEmails = 0;
    const results = [];

    for (const batch of batches) {
      const emailHtml = `
          <h2>Consultant Follow-up Reminder</h2>
          <p>Hi ${batch.consultantName}, here are your cases that have been registered for more than 1 day and may need follow-up.</p>
          <ul>
            ${batch.cases
              .map(
                (item) => `
              <li>
                <strong>${item.case_code || item.id}</strong><br />
                Client: ${item.client_name || "-"}<br />
                Company: ${item.company_name || "-"}<br />
                Status: ${item.status || "New"}<br />
                Client Email: ${item.email || "-"}<br />
                Client Phone: ${item.phone || "-"}
              </li>
            `
              )
              .join("")}
          </ul>
          <p>Please follow up with the client if needed.</p>
          <p>Capital Island Sdn Bhd</p>
        `;

      const { data, error: emailError } = await resend.emails.send({
        from: "Capital Island <noreply@kreditlab.my>",
        to: [batch.consultantEmail],
        subject: `Follow-up Reminder: ${batch.cases.length} case${
          batch.cases.length === 1 ? "" : "s"
        } need attention`,
        html: emailHtml,
      });

      if (emailError) {
        results.push({
          consultantId: batch.consultantId,
          consultantEmail: batch.consultantEmail,
          sent: false,
          error: emailError,
        });

        continue;
      }

      const caseIds = batch.cases.map((item) => item.id);
      const { error: updateError } = await supabaseAdmin
        .from("cases")
        .update({
          consultant_reminder_sent_at: new Date().toISOString(),
        })
        .in("id", caseIds);

      results.push({
        consultantId: batch.consultantId,
        consultantEmail: batch.consultantEmail,
        caseIds,
        sent: true,
        resendData: data,
        updateError: updateError?.message || null,
      });

      sentEmails++;
      sentCount += batch.cases.length;
    }

    return Response.json({
      success: true,
      cutoff: schedule.createdBeforeUtcIso,
      localDate: schedule.localDateKey,
      foundCases: cases.length,
      eligibleCases: eligibleCases.length,
      skippedCases,
      sentEmails,
      sent: sentCount,
      results,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to send consultant reminders",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
