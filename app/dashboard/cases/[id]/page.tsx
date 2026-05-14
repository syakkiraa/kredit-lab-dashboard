"use client";

import { useEffect, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const id = params.id as string;

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("financial_statement");
  const [documentError, setDocumentError] = useState("");

  const [selectedBankDocs, setSelectedBankDocs] = useState<string[]>([]);
  const [selectedFinancialDocs, setSelectedFinancialDocs] = useState<string[]>(
    []
  );

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("case_documents")
      .select("*")
      .eq("case_id", id)
      .order("uploaded_at", { ascending: false });

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

  const handleUpdateCase = async () => {
    if (!caseData) return;

    setSaving(true);

    const { error } = await supabase
      .from("cases")
      .update({
        company_name: caseData.company_name,
        client_name: caseData.client_name,
        email: caseData.email,
        phone: caseData.phone,
        industry: caseData.industry,
        requested_amount: Number(caseData.requested_amount || 0),
        loan_purpose: caseData.loan_purpose,
        status: caseData.status,
        assigned_to: caseData.assigned_to,
        ssm_registration_id: caseData.ssm_registration_id,
        initial_notes: caseData.initial_notes,
        annual_revenue: caseData.annual_revenue
          ? Number(caseData.annual_revenue)
          : null,
        employee_count: caseData.employee_count
          ? Number(caseData.employee_count)
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseData.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setIsEditing(false);
    alert("Case updated successfully.");
  };

  const handleDeleteCase = async () => {
    if (!caseData) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${caseData.company_name}?`
    );

    if (!confirmDelete) return;

    setDeleting(true);

    const { error } = await supabase
      .from("cases")
      .delete()
      .eq("id", caseData.id);

    setDeleting(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard/cases");
    router.refresh();
  };

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

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-400";

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

                <button
                  type="button"
                  onClick={() => setIsEditing((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  {isEditing ? "Cancel" : "Edit"}
                </button>

                <button
                  type="button"
                  onClick={handleDeleteCase}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            <div className="mb-4">
              {isEditing && caseData ? (
                <input
                  value={caseData.company_name}
                  onChange={(e) =>
                    setCaseData({ ...caseData, company_name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-3xl font-bold text-slate-900 outline-none focus:border-cyan-400"
                />
              ) : (
                <h1 className="text-3xl font-bold text-slate-900">
                  {caseData?.company_name}
                </h1>
              )}

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

            {isEditing && (
              <div className="mb-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleUpdateCase}
                  disabled={saving}
                  className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}

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
                        {isEditing ? (
                          <input
                            value={caseData.company_name}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                company_name: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="mt-1 text-xl font-semibold text-slate-900">
                            {caseData.company_name}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Employee Count</p>
                        {isEditing ? (
                          <input
                            type="number"
                            value={caseData.employee_count ?? ""}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                employee_count: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="mt-1 text-xl font-semibold text-slate-900">
                            {caseData.employee_count ?? "-"}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Industry</p>
                        {isEditing ? (
                          <input
                            value={caseData.industry}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                industry: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="mt-1 text-xl font-semibold text-slate-900">
                            {caseData.industry}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Loan Purpose</p>
                        {isEditing ? (
                          <input
                            value={caseData.loan_purpose || ""}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                loan_purpose: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="mt-1 text-xl font-semibold text-slate-900">
                            {caseData.loan_purpose || "-"}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Annual Revenue</p>
                        {isEditing ? (
                          <input
                            type="number"
                            value={caseData.annual_revenue ?? ""}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                annual_revenue: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="mt-1 text-xl font-semibold text-slate-900">
                            {caseData.annual_revenue
                              ? formatCurrency(caseData.annual_revenue)
                              : "-"}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Loan Amount</p>
                        {isEditing ? (
                          <input
                            type="number"
                            value={caseData.requested_amount}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                requested_amount: Number(e.target.value),
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="mt-1 text-3xl font-bold text-slate-900">
                            {formatCurrency(caseData.requested_amount)}
                          </p>
                        )}
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
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Client Name</p>
                        {isEditing ? (
                          <input
                            value={caseData.client_name}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                client_name: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="text-lg font-semibold text-slate-900">
                            {caseData.client_name}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Email</p>
                        {isEditing ? (
                          <input
                            type="email"
                            value={caseData.email}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                email: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="break-all text-lg font-semibold text-slate-900">
                            {caseData.email}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Phone</p>
                        {isEditing ? (
                          <input
                            value={caseData.phone || ""}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                phone: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="text-lg font-semibold text-slate-900">
                            {caseData.phone || "-"}
                          </p>
                        )}
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
                        {isEditing ? (
                          <input
                            value={caseData.ssm_registration_id || ""}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                ssm_registration_id: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {caseData.ssm_registration_id || "-"}
                          </p>
                        )}
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
                        <p className="text-slate-500">Assigned To</p>
                        {isEditing ? (
                          <input
                            value={caseData.assigned_to || ""}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                assigned_to: e.target.value,
                              })
                            }
                            className="w-40 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          />
                        ) : (
                          <p className="font-medium text-slate-900">
                            {caseData.assigned_to || "-"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <p className="text-slate-500">Status</p>
                        {isEditing ? (
                          <select
                            value={caseData.status || "New"}
                            onChange={(e) =>
                              setCaseData({
                                ...caseData,
                                status: e.target.value,
                              })
                            }
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="New">New</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        ) : (
                          <p className="font-medium text-slate-900">
                            {caseData.status || "New"}
                          </p>
                        )}
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
                          <p className="font-semibold text-slate-900">
                            Created
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatDate(
                              caseData.created_at || caseData.updated_at
                            )}
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
                </div>
              </div>
            )}

            {activeTab === "documents" && caseData && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Upload Documents
                  </h2>

                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="financial_statement">
                      Financial Statement
                    </option>
                    <option value="bank_statement">Bank Statement</option>
                    <option value="ssm">SSM Document</option>
                    <option value="supporting_document">
                      Supporting Document
                    </option>
                    <option value="other">Other</option>
                  </select>

                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <Upload className="mx-auto mb-4 h-10 w-10 text-slate-500" />

                    <p className="text-sm text-slate-700">
                      Drag and drop files here, or click to browse
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
                    </div>
                  ) : (
                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                      <table className="min-w-full">
                        <tbody>
                          {documents.map((doc) => (
                            <tr key={doc.id} className="border-t text-sm">
                              <td className="px-4 py-4">{doc.file_name}</td>
                              <td className="px-4 py-4 capitalize">
                                {(doc.document_type || "other").replaceAll(
                                  "_",
                                  " "
                                )}
                              </td>
                              <td className="px-4 py-4">
                                {formatDate(doc.uploaded_at)}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadDocument(doc)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="text-red-500"
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
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Bank Statement Analyzer
                  </h2>

                  <div className="mt-4 space-y-3">
                    {documents
                      .filter((doc) => doc.document_type === "bank_statement")
                      .map((doc) => (
                        <label
                          key={doc.id}
                          className="flex items-center gap-3 rounded-xl border px-4 py-3"
                        >
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBankDocs((prev) => [
                                  ...prev,
                                  doc.id,
                                ]);
                              } else {
                                setSelectedBankDocs((prev) =>
                                  prev.filter((x) => x !== doc.id)
                                );
                              }
                            }}
                          />
                          {doc.file_name}
                        </label>
                      ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBankDocs.length === 0) {
                        alert("Please select at least one bank statement.");
                        return;
                      }

                      alert(
                        `Running analysis for ${selectedBankDocs.length} selected document(s)`
                      );
                    }}
                    className="mt-5 w-full rounded-xl bg-cyan-300 px-4 py-3 font-medium text-slate-900"
                  >
                    Run Analysis
                  </button>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Financial Statement Analyzer
                  </h2>

                  <div className="mt-4 space-y-3">
                    {documents
                      .filter(
                        (doc) => doc.document_type === "financial_statement"
                      )
                      .map((doc) => (
                        <label
                          key={doc.id}
                          className="flex items-center gap-3 rounded-xl border px-4 py-3"
                        >
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFinancialDocs((prev) => [
                                  ...prev,
                                  doc.id,
                                ]);
                              } else {
                                setSelectedFinancialDocs((prev) =>
                                  prev.filter((x) => x !== doc.id)
                                );
                              }
                            }}
                          />
                          {doc.file_name}
                        </label>
                      ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedFinancialDocs.length === 0) {
                        alert(
                          "Please select at least one financial statement."
                        );
                        return;
                      }

                      alert(
                        `Running analysis for ${selectedFinancialDocs.length} selected document(s)`
                      );
                    }}
                    className="mt-5 w-full rounded-xl bg-cyan-300 px-4 py-3 font-medium text-slate-900"
                  >
                    Run Analysis
                  </button>
                </section>
              </div>
            )}

            {activeTab === "notes" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Notes</h2>

                {isEditing && caseData ? (
                  <textarea
                    value={caseData.initial_notes || ""}
                    onChange={(e) =>
                      setCaseData({
                        ...caseData,
                        initial_notes: e.target.value,
                      })
                    }
                    className="mt-3 min-h-40 w-full rounded-xl border border-slate-300 p-3 text-sm"
                  />
                ) : (
                  <p className="mt-3 text-sm text-slate-700">
                    {caseData?.initial_notes || "No notes yet."}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}