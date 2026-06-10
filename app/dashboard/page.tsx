"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CaseItem = {
  id: string;
  case_code: string | null;
  client_name: string | null;
  company_name: string | null;
  industry: string | null;
  status: string | null;
  requested_amount: number | null;
  created_at: string;
};

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    setLoading(true);

    const { data, error } = await supabase
      .from("cases")
      .select(
        "id, case_code, client_name, company_name, industry, status, requested_amount, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Dashboard fetch error:", error.message);
      setCases([]);
    } else {
      setCases(data || []);
    }

    setLoading(false);
  }

  const filteredCases = cases.filter((item) => {
    const keyword = search.toLowerCase();

    return (
      item.company_name?.toLowerCase().includes(keyword) ||
      item.client_name?.toLowerCase().includes(keyword) ||
      item.case_code?.toLowerCase().includes(keyword) ||
      item.status?.toLowerCase().includes(keyword)
    );
  });

  const totalCases = cases.length;

  const activeCases = cases.filter(
    (item) =>
      item.status !== "Rejected" &&
      item.status !== "Closed Lost" &&
      item.status !== "Closed Won" &&
      item.status !== "Approved"
  ).length;

  const pendingAnalysis = cases.filter(
    (item) =>
      item.status === "New" ||
      item.status === "In Progress" ||
      item.status === "Under Review"
  ).length;

  const uncheckedCases = cases.filter(
    (item) => item.status === "New" || item.status === "In Progress"
  ).length;

  const pipelineValue = cases.reduce(
    (sum, item) => sum + Number(item.requested_amount || 0),
    0
  );

  const recentCases = filteredCases.slice(0, 5);

  const pipelineStages = useMemo(() => {
    const stages = [
      "New",
      "Qualification",
      "Analysis",
      "Proposal",
      "Negotiation",
      "Closed Won",
      "Closed Lost",
    ];

    return stages.map((stage) => {
      const stageCases = cases.filter((item) => item.status === stage);
      const value = stageCases.reduce(
        (sum, item) => sum + Number(item.requested_amount || 0),
        0
      );

      return {
        name: stage,
        count: stageCases.length,
        value,
      };
    });
  }, [cases]);

  function formatMoney(value: number) {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-MY", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function statusClass(status: string | null) {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-700";
      case "In Progress":
        return "bg-yellow-100 text-yellow-700";
      case "Under Review":
        return "bg-purple-100 text-purple-700";
      case "Approved":
      case "Closed Won":
        return "bg-green-100 text-green-700";
      case "Rejected":
      case "Closed Lost":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-slate-600">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welcome back! Here's your overview.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-cyan-400"
          />

          <div className="relative">
            <button className="rounded-full p-2 hover:bg-slate-100">
              🔔
            </button>

            {uncheckedCases > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-xs font-bold text-white">
                {uncheckedCases}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-700">
              A
            </div>
            <span className="text-sm font-semibold text-slate-700">
              Admin User
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Top Cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <DashboardCard
            title="Total Cases"
            value={totalCases}
            sub="+ cases recorded"
            icon="💼"
          />
          <DashboardCard
            title="Active Cases"
            value={activeCases}
            sub="currently active"
            icon="🕒"
          />
          <DashboardCard
            title="Pending Analysis"
            value={pendingAnalysis}
            sub="needs review"
            icon="📋"
          />
          <DashboardCard
            title="Pipeline Value"
            value={formatMoney(pipelineValue)}
            sub="total requested amount"
            icon="📈"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Recent Cases */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Recent Cases</h2>
              <Link
                href="/dashboard/cases"
                className="text-sm font-medium text-slate-700 hover:text-slate-950"
              >
                View all →
              </Link>
            </div>

            <div className="space-y-5">
              {recentCases.length === 0 ? (
                <p className="text-sm text-slate-500">No cases found.</p>
              ) : (
                recentCases.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-500">
                        🏢
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {item.company_name || "-"}
                          </p>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusClass(
                              item.status
                            )}`}
                          >
                            {item.status || "New"}
                          </span>
                        </div>

                        <p className="text-sm text-slate-500">
                          {item.client_name || "-"} • {item.industry || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatMoney(Number(item.requested_amount || 0))}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pipeline Overview */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-6 font-semibold text-slate-900">
              Pipeline Overview
            </h2>

            <div className="space-y-4">
              {pipelineStages.map((stage) => {
                const max = Math.max(...pipelineStages.map((s) => s.count), 1);
                const width = `${(stage.count / max) * 100}%`;

                return (
                  <div key={stage.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-800">
                        {stage.name}
                      </span>
                      <span className="text-slate-500">
                        {stage.count} ({formatMoney(stage.value)})
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-teal-400"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Recent Analysis Activity */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-900">
            Recent Analysis Activity
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            {recentCases.slice(0, 6).map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <p className="font-medium text-slate-900">
                    {index % 2 === 0
                      ? "Credit Score"
                      : index % 3 === 0
                      ? "Bank Statement"
                      : "Financial Statement"}
                  </p>
                  <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Completed
                  </span>
                </div>

                <p className="text-sm text-slate-600">
                  {item.company_name || "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(item.created_at)}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${70 + (index % 3) * 8}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    {70 + (index % 3) * 8}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-xs text-green-600">{sub}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}