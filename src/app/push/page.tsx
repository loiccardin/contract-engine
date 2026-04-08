"use client";

import { useState, useEffect } from "react";
import StepIndicator from "@/components/StepIndicator";

interface PushResult {
  code: string;
  status: string;
  powerform_url?: string;
  is_new?: boolean;
}

interface PushData {
  version_number: number;
  pushed_at: string;
  results: PushResult[];
  errors: { code: string; error: string }[];
}

export default function PushPage() {
  const [data, setData] = useState<PushData | null>(null);
  const [dbContracts, setDbContracts] = useState<{ code: string; docusignPowerformId: string | null }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("app_token");

    // Check for push results from /generate redirect
    const stored = sessionStorage.getItem("push_results");
    if (stored) {
      setData(JSON.parse(stored));
      sessionStorage.removeItem("push_results");
    } else if (saved) {
      // Direct access — load from DB
      fetch("/api/contracts", { headers: { Authorization: `Bearer ${saved}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setDbContracts(d.data); });
    }
  }, []);

  const accountId = "6a35f214-1ce1-491c-87b6-8554f654f613";

  // Show push results
  if (data) {
    const okCount = data.results.filter(r => r.status === "ok").length;
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Contract Engine</h1>
            </div>
            <StepIndicator currentStep={3} />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Push DocuSign termine</h2>
                <p className="text-sm text-gray-500">
                  Version {data.version_number} — {okCount}/18 ok — {new Date(data.pushed_at).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {data.results.map(r => (
              <div key={r.code} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3.5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${r.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="font-medium text-gray-800">{r.code}</span>
                  {r.status === "ok" && r.is_new && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Nouveau</span>
                  )}
                  {r.status === "ok" && r.is_new === false && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Mis a jour</span>
                  )}
                </div>
                {r.powerform_url && (
                  <a href={r.powerform_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline">PowerForm</a>
                )}
              </div>
            ))}
          </div>

          {data.errors.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm font-medium text-red-700 mb-2">Erreurs</p>
              {data.errors.map(e => (
                <p key={e.code} className="text-sm text-red-600">{e.code} : {e.error}</p>
              ))}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 flex gap-3">
            <a href="/editor" className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour a l&apos;editeur
            </a>
            <a href="/generate" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm shadow-sm">
              Regenerer
            </a>
          </div>
        </main>
      </div>
    );
  }

  // Direct access — show existing PowerForms from DB
  const contractsWithPF = dbContracts.filter(c => c.docusignPowerformId);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Contract Engine</h1>
          </div>
          <StepIndicator currentStep={3} />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {contractsWithPF.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">PowerForms DocuSign</h2>
              <p className="text-sm text-gray-500 mt-1">{contractsWithPF.length} templates configures</p>
            </div>
            <div className="space-y-2">
              {contractsWithPF.map(c => (
                <div key={c.code} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3.5 shadow-sm hover:shadow-md transition-shadow">
                  <span className="font-medium text-gray-800">{c.code}</span>
                  <a href={`https://powerforms.docusign.net/${c.docusignPowerformId}?env=eu&acct=${accountId}&v=2`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline">PowerForm</a>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Aucun push effectue</h2>
            <p className="text-gray-500 text-sm">Allez sur Generer pour creer les contrats et les pousser dans DocuSign.</p>
            <a href="/generate" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm shadow-sm">
              Aller a la generation
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
