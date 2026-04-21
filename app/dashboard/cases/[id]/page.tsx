"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
  }, [id]);

  if (!loading && !caseData) {
    notFound();
  }

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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (value: string | null) => {
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
      <div className="mx-auto max-w-7xl">
        {loading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">Loading...</div>
        ) : (
          <>
            {/* Top back row */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/dashboard/cases"
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                ← Back to Cases
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getStatusStyles(caseData?.status ?? null)}`}
                >
                  {caseData?.status || "New"}
                </span>

                <span className="text-lg font-semibold text-slate-900">
                  {formatCurrency(caseData?.requested_amount || 0)}
                </span>

                <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Edit
                </button>
              </div>
            </div>

            {/* Header card */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-slate-900">
                {caseData?.company_name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {caseData?.case_code || caseData?.id} • {caseData?.client_name}
              </p>
            </div>

            {/* Tabs */}
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-200 p-2">
                {renderTabButton("overview", "Overview")}
                {renderTabButton("documents", "Documents")}
                {renderTabButton("analysis", "Analysis")}
                {renderTabButton("notes", "Notes")}
                {renderTabButton("pipeline", "Pipeline")}
                {renderTabButton("report", "Report")}
              </div>

              {/* OVERVIEW */}
              {activeTab === "overview" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Client Information
                    </h2>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <p>
                        <span className="font-medium">Client Name:</span>{" "}
                        {caseData?.client_name}
                      </p>
                      <p>
                        <span className="font-medium">Company Name:</span>{" "}
                        {caseData?.company_name}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span>{" "}
                        {caseData?.email}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span>{" "}
                        {caseData?.phone || "-"}
                      </p>
                      <p>
                        <span className="font-medium">SSM Registration ID:</span>{" "}
                        {caseData?.ssm_registration_id || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Business Details
                    </h2>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <p>
                        <span className="font-medium">Industry:</span>{" "}
                        {caseData?.industry}
                      </p>
                      <p>
                        <span className="font-medium">Employee Count:</span>{" "}
                        {caseData?.employee_count ?? "-"}
                      </p>
                      <p>
                        <span className="font-medium">Annual Revenue:</span>{" "}
                        {caseData?.annual_revenue
                          ? formatCurrency(caseData.annual_revenue)
                          : "-"}
                      </p>
                      <p>
                        <span className="font-medium">Assigned To:</span>{" "}
                        {caseData?.assigned_to || "-"}
                      </p>
                      <p>
                        <span className="font-medium">Last Updated:</span>{" "}
                        {formatDate(caseData?.updated_at || null)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Financing Request
                    </h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-700">
                      <p>
                        <span className="font-medium">Requested Amount:</span>{" "}
                        {formatCurrency(caseData?.requested_amount || 0)}
                      </p>
                      <p>
                        <span className="font-medium">Loan Purpose:</span>{" "}
                        {caseData?.loan_purpose || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCUMENTS */}
              {activeTab === "documents" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Documents
                  </h2>
                  <p className="mt-3 text-sm text-slate-600">
                    No documents connected yet. Later this tab will show uploaded
                    bank statements, financial statements, CCRIS/CTOS files, and
                    supporting documents.
                  </p>
                </div>
              )}

              {/* ANALYSIS */}
              {activeTab === "analysis" && caseData && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Analysis</h2>
                  <p className="mt-3 text-sm text-slate-600">
                    Analysis component not yet implemented.
                  </p>
                </div>
              )}

              {/* NOTES */}
              {activeTab === "notes" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
                  <p className="mt-3 text-sm text-slate-700">
                    {caseData?.initial_notes || "No notes yet."}
                  </p>
                </div>
              )}

              {/* PIPELINE */}
              {activeTab === "pipeline" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Pipeline
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {["Lead", "Docs Received", "Analysis", "Submission", "Approval", "Disbursement"].map(
                      (step) => (
                        <div
                          key={step}
                          className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700"
                        >
                          {step}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* REPORT */}
              {activeTab === "report" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Report</h2>
                  <p className="mt-3 text-sm text-slate-600">
                    This tab will later generate a consultant-ready report and bank
                    recommendation summary.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}