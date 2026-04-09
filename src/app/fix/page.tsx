"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import LogoutButton from "@/components/LogoutButton";

interface ContractInfo {
  code: string;
  googleDocId: string | null;
  docusignTemplateId: string | null;
  docusignTemplateName: string | null;
}

export default function FixPage() {
  const { apiCall } = useAuth();
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [selected, setSelected] = useState("");
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    apiCall("/api/contracts")
      .then(r => r.json())
      .then(d => { if (d.success) setContracts(d.data); });
  }, [apiCall]);

  const contract = contracts.find(c => c.code === selected);

  async function handlePush() {
    if (!selected || !token) return;
    setPushing(true);
    setResult(null);

    try {
      const res = await apiCall("/api/push-docusign/single", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ contractCode: selected }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: `${selected} mis à jour dans DocuSign` });
      } else {
        setResult({ success: false, message: data.error || "Erreur" });
      }
    } catch {
      setResult({ success: false, message: "Erreur réseau" });
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Correction unitaire</h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/editor" className="text-sm text-gray-500 hover:text-gray-700">Retour éditeur</a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Corriger un contrat</h2>
          <p className="text-sm text-gray-500 mt-1">
            Modifiez le document dans Google Docs, puis poussez-le seul vers DocuSign.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Contrat à corriger</label>
          <select
            value={selected}
            onChange={e => { setSelected(e.target.value); setResult(null); }}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Sélectionner un contrat...</option>
            {contracts.map(c => (
              <option key={c.code} value={c.code}>{c.code} {c.docusignTemplateName ? `— ${c.docusignTemplateName}` : ""}</option>
            ))}
          </select>

          {contract && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{contract.code}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{contract.docusignTemplateName || "Pas de template DocuSign"}</p>
                </div>
                {contract.googleDocId && (
                  <a
                    href={`https://docs.google.com/document/d/${contract.googleDocId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Ouvrir dans Drive
                  </a>
                )}
              </div>

              <p className="text-sm text-gray-500">
                Modifiez le document dans Google Docs si nécessaire, puis cliquez ci-dessous pour pousser la version corrigée vers DocuSign.
              </p>

              <button
                onClick={handlePush}
                disabled={pushing || !contract.docusignTemplateId}
                className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {pushing ? "Push en cours..." : `Pousser ${contract.code} vers DocuSign`}
              </button>

              {!contract.docusignTemplateId && (
                <p className="text-sm text-amber-600">Ce contrat n&apos;a pas encore de template DocuSign. Faites un push complet d&apos;abord.</p>
              )}
            </div>
          )}

          {result && (
            <div className={`mt-4 p-4 rounded-lg ${result.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <p className={`text-sm font-medium ${result.success ? "text-emerald-700" : "text-red-700"}`}>
                {result.message}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
