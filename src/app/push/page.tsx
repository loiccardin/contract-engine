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
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Contract Engine</h1>
            <StepIndicator currentStep={3} />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Push DocuSign terminé</h2>
            <p className="text-sm text-gray-400 mt-1">
              Version {data.version_number} — {okCount}/18 ok — {new Date(data.pushed_at).toLocaleString("fr-FR")}
            </p>
          </div>

          <div className="space-y-2">
            {data.results.map(r => (
              <div key={r.code} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${r.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="font-medium text-gray-800">{r.code}</span>
                  {r.status === "ok" && r.is_new && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Nouveau</span>
                  )}
                  {r.status === "ok" && r.is_new === false && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Mis à jour</span>
                  )}
                </div>
                {r.powerform_url && (
                  <a href={r.powerform_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-violet-600 hover:underline">PowerForm</a>
                )}
              </div>
            ))}
          </div>

          {data.errors.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-700 mb-2">Erreurs :</p>
              {data.errors.map(e => (
                <p key={e.code} className="text-sm text-red-600">{e.code} : {e.error}</p>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Direct access — show existing PowerForms from DB
  const contractsWithPF = dbContracts.filter(c => c.docusignPowerformId);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Contract Engine</h1>
          <StepIndicator currentStep={3} />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {contractsWithPF.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">PowerForms DocuSign</h2>
              <p className="text-sm text-gray-400 mt-1">{contractsWithPF.length} templates configurés</p>
            </div>
            <div className="space-y-2">
              {contractsWithPF.map(c => (
                <div key={c.code} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
                  <span className="font-medium text-gray-800">{c.code}</span>
                  <a href={`https://powerforms.docusign.net/${c.docusignPowerformId}?env=eu&acct=${accountId}&v=2`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm text-violet-600 hover:underline">PowerForm</a>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun push effectué</h2>
            <p className="text-gray-400">Allez sur Générer pour créer les contrats et les pousser dans DocuSign.</p>
          </div>
        )}
      </main>
    </div>
  );
}
