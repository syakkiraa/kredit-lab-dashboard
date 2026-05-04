import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

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

    if (!resendApiKey || !supabaseUrl || !supabaseServiceRoleKey) {
      return Response.json(
        { error: "Missing environment variables" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: cases, error: fetchError } = await supabaseAdmin
      .from("cases")
      .select(
        "id, case_code, client_name, company_name, email, status, created_at, reminder_sent_at"
      )
      .lte("created_at", threeDaysAgo.toISOString())
      .is("reminder_sent_at", null)
      .not("email", "is", null);

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    if (!cases || cases.length === 0) {
      return Response.json({
        success: true,
        message: "No reminders to send",
        sent: 0,
      });
    }

    let sentCount = 0;

    for (const item of cases) {
      const { error: emailError } = await resend.emails.send({
        from: "Capital Island <onboarding@resend.dev>",
        to: item.email,
        subject: "Reminder: Your financing case is still in progress",
        html: `
          <h2>Hi ${item.client_name || "there"},</h2>
          <p>This is a friendly reminder that your financing case is still being processed.</p>
          <p><strong>Company:</strong> ${item.company_name || "-"}</p>
          <p><strong>Case ID:</strong> ${item.case_code || item.id}</p>
          <p><strong>Status:</strong> ${item.status || "New"}</p>
          <br />
          <p>Our consultant will contact you if further documents are needed.</p>
          <p>Capital Island Sdn Bhd</p>
        `,
      });

      if (!emailError) {
        await supabaseAdmin
          .from("cases")
          .update({
            reminder_sent_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        sentCount++;
      }
    }

    return Response.json({
      success: true,
      sent: sentCount,
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}