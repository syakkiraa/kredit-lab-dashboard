"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  User,
  Mail,
  Phone,
  CalendarDays,
  CircleDot,
  Pencil,
  ClipboardList,
  BarChart3,
  Upload,
  FileText,
  Trash2,
  Download,
} from "lucide-react";

type CaseItem = {
  id: string;
  case_code: string | null;
  company_name: string;
  client_name: string;
  email: string;
  phone: string | null;
  industry: string;
  requested_amount: number;
  loan_purpose: string | null;
  status: string | null;
  assigned_to: string | null;
  updated_at: string | null;
  ssm_registration_id: string | null;
  initial_notes: string | null;
  annual_revenue: number | null;
  employee_count: number | null;
  created_at?: string | null;
};

type CaseDocument = {
  id: string;
  case_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  document_type: string | null;
  uploaded_at: string | null;
};

type TabKey =
  | "overview"
  | "documents"
  | "analysis"
  | "notes"
  | "pipeline"
  | "report";

export default function CaseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("financial_statement");
  const [documentError, setDocumentError] = useState("");

  const fetchDocuments = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("case_documents")
      .select("*")
      .eq("case_id", id)
      .order("uploaded_at", { ascending: false });

    console.log("DOCUMENTS DATA:", data);
    console.log("DOCUMENTS ERROR:", error);

    if (!error && data) {
      setDocuments(data);
    }
  };

  useEffect(() => {
    const fetchCase = async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", id)
        .single();

      console.log("CASE DETAIL DATA:", data);
      console.log("CASE DETAIL ERROR:", error);

      if (error || !data) {
        setLoading(false);
        return;
      }

      setCaseData(data);
      setLoading(false);
    };

    fetchCase();
    fetchDocuments();
  }, [id]);

  if (!loading && !caseData) {
    notFound();
  }

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file || !caseData) return;

    setUploading(true);
    setDocumentError("");

    const safeFileName = file.name.replaceAll(" ", "-");
    const filePath = `cases/${caseData.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("case-documents")
      .upload(filePath, file);

    if (uploadError) {
      setDocumentError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("case_documents").insert([
      {
        case_id: caseData.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        document_type: documentType,
      },
    ]);

    if (dbError) {
      setDocumentError(dbError.message);
      setUploading(false);
      return;
    }

    await fetchDocuments();

    setUploading(false);
    event.target.value = "";
  };

  const handleDownloadDocument = async (doc: CaseDocument) => {
    setDocumentError("");

    const { data, error } = await supabase.storage
      .from("case-documents")
      .createSignedUrl(doc.file_path, 60);

    if (error || !data?.signedUrl) {
      setDocumentError(error?.message || "Unable to download file");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  const handleDeleteDocument = async (doc: CaseDocument) => {
    const confirmDelete = window.confirm(`Delete ${doc.file_name}?`);

    if (!confirmDelete) return;

    setDocumentError("");

    const { error: storageError } = await supabase.storage
      .from("case-documents")
      .remove([doc.file_path]);

    if (storageError) {
      setDocumentError(storageError.message);
      return;
    }

    const { error: dbError } = await supabase
      .from("case_documents")
      .delete()
      .eq("id", doc.id);

    if (dbError) {
      setDocumentError(dbError.message);
      return;
    }

    await fetchDocuments();
  };

  const getStatusStyles = (status: string | null) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "In Progress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Under Review":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
    }
  };

  const formatCurrency = (amount: number | null) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  };

  const renderTabButton = (tab: TabKey, label: string) => {
    const active = activeTab === tab;

    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
          active
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        {loading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">Loading...</div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/dashboard/cases"
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                ← Back to Cases
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getStatusStyles(
                    caseData?.status ?? null
                  )}`}
                >
                  {caseData?.status || "New"}
                </span>

                <span className="text-3xl font-bold text-slate-900">
                  {formatCurrency(caseData?.requested_amount || 0)}
                </span>

                <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h1 className="text-3xl font-bold text-slate-900">
                {caseData?.company_name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {caseData?.case_code || caseData?.id} • {caseData?.client_name}
              </p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-slate-200 p-2">
              {renderTabButton("overview", "Overview")}
              {renderTabButton("documents", "Documents")}
              {renderTabButton("analysis", "Analysis")}
              {renderTabButton("notes", "Notes")}
              {renderTabButton("pipeline", "Pipeline")}
              {renderTabButton("report", "Report")}
            </div>

            {activeTab === "overview" && caseData && (
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-cyan-500" />
                      <h2 className="text-xl font-semibold text-slate-900">
                        Company Information
                      </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-slate-500">Company Name</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">
                          {caseData.company_name}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Employee Count</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">
                          {caseData.employee_count ?? "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Industry</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">
                          {caseData.industry}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Loan Purpose</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">
                          {caseData.loan_purpose || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Annual Revenue</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">
                          {caseData.annual_revenue
                            ? formatCurrency(caseData.annual_revenue)
                            : "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Loan Amount</p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">
                          {formatCurrency(caseData.requested_amount)}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-2">
                      <User className="h-5 w-5 text-cyan-500" />
                      <h2 className="text-xl font-semibold text-slate-900">
                        Contact Information
                      </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-cyan-50 p-2">
                          <User className="h-5 w-5 text-cyan-500" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Client Name</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {caseData.client_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-cyan-50 p-2">
                          <Mail className="h-5 w-5 text-cyan-500" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Email</p>
                          <p className="break-all text-lg font-semibold text-slate-900">
                            {caseData.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-cyan-50 p-2">
                          <Phone className="h-5 w-5 text-cyan-500" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Phone</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {caseData.phone || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-cyan-500" />
                      <h2 className="text-xl font-semibold text-slate-900">
                        Registration Details
                      </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-slate-500">
                          SSM Registration ID
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {caseData.ssm_registration_id || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Case Code</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {caseData.case_code || caseData.id}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 text-xl font-semibold text-slate-900">
                      Case Summary
                    </h2>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-slate-500">Pipeline Stage</p>
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium">
                          Proposal
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <p className="text-slate-500">Assigned To</p>
                        <p className="font-medium text-slate-900">
                          {caseData.assigned_to || "-"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <p className="text-slate-500">Status</p>
                        <p className="font-medium text-slate-900">
                          {caseData.status || "New"}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-cyan-500" />
                      <h2 className="text-xl font-semibold text-slate-900">
                        Timeline
                      </h2>
                    </div>

                    <div className="space-y-6">
                      <div className="flex gap-3">
                        <CircleDot className="mt-1 h-4 w-4 text-cyan-500" />
                        <div>
                          <p className="font-semibold text-slate-900">Created</p>
                          <p className="text-sm text-slate-500">
                            {formatDate(caseData.created_at || caseData.updated_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <CircleDot className="mt-1 h-4 w-4 text-cyan-500" />
                        <div>
                          <p className="font-semibold text-slate-900">
                            Last Updated
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatDate(caseData.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-cyan-500" />
                      <h2 className="text-xl font-semibold text-slate-900">
                        Analysis Scores
                      </h2>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-600">Bank Statement</span>
                          <span className="font-semibold text-slate-900">72</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div className="h-2 w-[72%] rounded-full bg-green-500" />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-600">Credit Score</span>
                          <span className="font-semibold text-slate-900">680</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div className="h-2 w-full rounded-full bg-green-500" />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "documents" && caseData && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Upload Documents
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Upload bank statements, financial statements, and other supporting documents
                  </p>

                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <Upload className="mx-auto mb-4 h-10 w-10 text-slate-500" />

                    <p className="text-sm text-slate-700">
                      Drag and drop files here, or click to browse
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Supported formats: PDF, XLS, XLSX, DOC, DOCX (Max 25MB)
                    </p>

                    <div className="mt-5 flex justify-center">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50">
                        <Upload className="h-4 w-4" />
                        Browse Files

                        <input
                          type="file"
                          accept=".pdf,.xls,.xlsx,.doc,.docx"
                          onChange={handleDocumentUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {documentError && (
                    <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                      {documentError}
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Uploaded Documents ({documents.length})
                  </h2>

                  {documents.length === 0 ? (
                    <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="mb-4 h-12 w-12 text-slate-500" />

                      <p className="font-medium text-slate-700">
                        No documents uploaded yet
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Upload documents to begin analysis
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                      <table className="min-w-full">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-sm text-slate-600">
                            <th className="px-4 py-3">File</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Uploaded</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {documents.map((doc) => (
                            <tr key={doc.id} className="border-t text-sm">
                              <td className="px-4 py-4">{doc.file_name}</td>

                              <td className="px-4 py-4 capitalize">
                                {(doc.document_type || "other").replaceAll("_", " ")}
                              </td>

                              <td className="px-4 py-4">
                                {formatDate(doc.uploaded_at)}
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadDocument(doc)}
                                    className="text-slate-600 hover:text-slate-900"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === "analysis" && caseData && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Bank Statement Analyzer */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="rounded-xl bg-cyan-50 p-3">
                      <FileText className="h-6 w-6 text-cyan-500" />
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Bank Statement Analyzer
                      </h2>

                      <p className="mt-1 text-sm text-slate-600">
                        Analyze cash flow patterns, transaction history, and account health
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    Required documents: bank statement
                  </div>

                  <a
                    href={process.env.NEXT_PUBLIC_ANALYZER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-cyan-400"
                  >
                    Run Analysis
                  </a>

                  <p className="mt-4 text-center text-xs text-slate-500">
                    Upload and process required documents first
                  </p>
                </section>

                {/* Financial Statement Analyzer */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="rounded-xl bg-cyan-50 p-3">
                      <BarChart3 className="h-6 w-6 text-cyan-500" />
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Financial Statement Analyzer
                      </h2>

                      <p className="mt-1 text-sm text-slate-600">
                        Evaluate profit margins, debt ratios, and financial health indicators
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    Required documents: financial statement
                  </div>

                  <a
                    href={process.env.NEXT_PUBLIC_ANALYZER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-cyan-400"
                  >
                    Run Analysis
                  </a>

                  <p className="mt-4 text-center text-xs text-slate-500">
                    Upload and process required documents first
                  </p>
                </section>

                {/* Credit Scoring Engine */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="rounded-xl bg-cyan-50 p-3">
                      <CircleDot className="h-6 w-6 text-cyan-500" />
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Credit Scoring Engine
                      </h2>

                      <p className="mt-1 text-sm text-slate-600">
                        Calculate credit worthiness based on multiple data points
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    Required documents: bank statement, financial statement
                  </div>

                  <a
                    href={process.env.NEXT_PUBLIC_ANALYZER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-cyan-400"
                  >
                    Run Analysis
                  </a>

                  <p className="mt-4 text-center text-xs text-slate-500">
                    Upload and process required documents first
                  </p>
                </section>

                {/* Bank Matching Engine */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="rounded-xl bg-cyan-50 p-3">
                      <ClipboardList className="h-6 w-6 text-cyan-500" />
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Bank Matching Engine
                      </h2>

                      <p className="mt-1 text-sm text-slate-600">
                        Cross-reference bank transactions with financial statement entries
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    Required documents: bank statement, financial statement
                  </div>

                  <a
                    href={process.env.NEXT_PUBLIC_ANALYZER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-cyan-400"
                  >
                    Run Analysis
                  </a>

                  <p className="mt-4 text-center text-xs text-slate-500">
                    Upload and process required documents first
                  </p>
                </section>
              </div>
            )}

            {activeTab === "notes" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
                <p className="mt-3 text-sm text-slate-700">
                  {caseData?.initial_notes || "No notes yet."}
                </p>
              </div>
            )}

            {activeTab === "pipeline" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Pipeline
                </h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    "Lead",
                    "Docs Received",
                    "Analysis",
                    "Submission",
                    "Approval",
                    "Disbursement",
                  ].map((step) => (
                    <div
                      key={step}
                      className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700"
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "report" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Report</h2>
                <p className="mt-3 text-sm text-slate-600">
                  This tab will later generate a consultant-ready report and bank
                  recommendation summary.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}