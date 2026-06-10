import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

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

    const consultantEmails =
      process.env.CONSULTANT_NOTIFY_EMAILS
        ?.split(",")
        .map((email) => email.trim())
        .filter(Boolean) || [];

    if (
      !resendApiKey ||
      !supabaseUrl ||
      !supabaseServiceRoleKey ||
      consultantEmails.length === 0
    ) {
      return Response.json(
        {
          error: "Missing environment variables",
          hasResendApiKey: !!resendApiKey,
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
          hasConsultantEmails: consultantEmails.length > 0,
        },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Consultant reminder: cases older than 1 day.
    const reminderCutoff = new Date();
    reminderCutoff.setMinutes(reminderCutoff.getMinutes() - 1);

    const { data: cases, error: fetchError } = await supabaseAdmin
      .from("cases")
      .select(
        "id, case_code, client_name, company_name, email, phone, status, created_at, consultant_reminder_sent_at"
      )
      .lte("created_at", reminderCutoff.toISOString())
      .is("consultant_reminder_sent_at", null)
      .not("email", "is", null);

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    if (!cases || cases.length === 0) {
      return Response.json({
        success: true,
        message: "No consultant reminders to send",
        cutoff: reminderCutoff.toISOString(),
        foundCases: 0,
        sent: 0,
      });
    }

    let sentCount = 0;
    const results = [];

    for (const item of cases) {
      const { data, error: emailError } = await resend.emails.send({
        from: "Capital Island <noreply@kreditlab.my>",
        to: consultantEmails,
        subject: `Follow-up Reminder: Case ${item.case_code || item.id}`,
        html: `
          <h2>Consultant Follow-up Reminder</h2>
          <p>This case has been registered for more than 1 day and may need follow-up.</p>

          <p><strong>Client Name:</strong> ${item.client_name || "-"}</p>
          <p><strong>Company:</strong> ${item.company_name || "-"}</p>
          <p><strong>Case ID:</strong> ${item.case_code || item.id}</p>
          <p><strong>Status:</strong> ${item.status || "New"}</p>
          <p><strong>Client Email:</strong> ${item.email || "-"}</p>
          <p><strong>Client Phone:</strong> ${item.phone || "-"}</p>

          <br />
          <p>Please follow up with the client if needed.</p>
          <p>Capital Island Sdn Bhd</p>
        `,
      });

      if (emailError) {
        results.push({
          caseId: item.id,
          sent: false,
          error: emailError,
        });

        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from("cases")
        .update({
          consultant_reminder_sent_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      results.push({
        caseId: item.id,
        sent: true,
        resendData: data,
        updateError: updateError?.message || null,
      });

      sentCount++;
    }

    return Response.json({
      success: true,
      cutoff: reminderCutoff.toISOString(),
      foundCases: cases.length,
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