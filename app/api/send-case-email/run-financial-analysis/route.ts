import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { caseId, documentIds } = await req.json();

    if (!caseId || !documentIds || documentIds.length === 0) {
      return Response.json(
        { error: "caseId and documentIds are required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const analyzerUrl = process.env.ANALYZER_API_URL;

    if (!supabaseUrl || !serviceRoleKey || !analyzerUrl) {
      return Response.json(
        { error: "Missing server environment variables" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: docs, error: docsError } = await supabaseAdmin
      .from("case_documents")
      .select("*")
      .eq("case_id", caseId)
      .in("id", documentIds);

    if (docsError) {
      return Response.json({ error: docsError.message }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      return Response.json({ error: "No documents found" }, { status: 404 });
    }

    const formData = new FormData();

    for (const doc of docs) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from("case-documents")
        .download(doc.file_path);

      if (downloadError || !fileData) {
        return Response.json(
          { error: downloadError?.message || "Failed to download document" },
          { status: 500 }
        );
      }

      formData.append("file", fileData, doc.file_name);
    }

    const analyzerResponse = await fetch(`${analyzerUrl}/analyze`, {
      method: "POST",
      body: formData,
    });

    const analyzerResult = await analyzerResponse.json();

    if (!analyzerResponse.ok || !analyzerResult.success) {
      return Response.json(
        { error: analyzerResult.error || "Analyzer failed" },
        { status: 500 }
      );
    }

    const { error: saveError } = await supabaseAdmin
      .from("case_analysis_reports")
      .insert([
        {
          case_id: caseId,
          analysis_type: "financial_statement",
          report_html: analyzerResult.html,
          report_json: analyzerResult,
        },
      ]);

    if (saveError) {
      return Response.json({ error: saveError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Analysis completed",
      report: analyzerResult,
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to run analysis" },
      { status: 500 }
    );
  }
}