"use client";

import { useState, useEffect } from "react";
import StepIndicator from "@/components/StepIndicator";

interface ContractResult {
  code: string;
  status: string;
  googleDocUrl?: string;
  pdfUrl?: string;
  articleCount?: number;
  template_id?: string;
  powerform_url?: string;
}

interface GenerateResponse {
  generatedAt: string;
  contracts: ContractResult[];
  errors: { code: string; error: string }[];
}

interface PushResponse {
  version_number: number;
  description: string;
  results: ContractResult[];
  errors: { code: string; error: string }[];
}

export default function GeneratePage() {
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"idle" | "generating" | "review" | "pushing" | "done">("idle");
  const [generateData, setGenerateData] = useState<GenerateResponse | null>(null);
  const [pushData, setPushData] = useState<PushResponse | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("app_token");
    if (saved) setToken(saved);
  }, []);

  async function handleGenerate() {
    if (!token) { setError("Connectez-vous d'abord via /editor"); return; }
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setGenerateData(data.data);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStep("idle");
    }
  }

  async function handlePush() {
    if (!description.trim()) { setError("Description requise"); return; }
    setStep("pushing");
    setError(null);
    try {
      const res = await fetch("/api/push-docusign", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPushData(data.data);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStep("review");
    }
  }

  const okCount = generateData?.contracts.filter(c => c.status === "ok").length || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Contract Engine</h1>
          <StepIndicator currentStep={2} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Step 1: Generate */}
        {step === "idle" && (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Générer les 18 contrats</h2>
            <p className="text-gray-400 mb-8">Assemble les articles, génère les DOCX et PDFs, uploade dans Google Drive.</p>
            <button onClick={handleGenerate} className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
              Générer les 18 DOCX
            </button>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-600 font-medium">Génération en cours...</p>
            <p className="text-sm text-gray-400 mt-1">18 DOCX + 18 PDFs — ~5 minutes</p>
          </div>
        )}

        {/* Step 2: Review */}
        {(step === "review" || step === "pushing") && generateData && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {okCount}/18 contrats générés
              </h2>
              <p className="text-sm text-gray-400 mt-1">Vérifiez les documents dans Drive. Corrigez directement dans Drive si nécessaire.</p>
            </div>

            <div className="space-y-2 mb-8">
              {generateData.contracts.map(c => (
                <div key={c.code} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${c.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-medium text-gray-800">{c.code}</span>
                    {c.articleCount && <span className="text-xs text-gray-400">{c.articleCount} articles</span>}
                  </div>
                  {c.googleDocUrl && (
                    <a href={c.googleDocUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline">Voir dans Drive</a>
                  )}
                </div>
              ))}
            </div>

            {generateData.errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-700 mb-2">Erreurs :</p>
                {generateData.errors.map(e => (
                  <p key={e.code} className="text-sm text-red-600">{e.code} : {e.error}</p>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Pousser dans DocuSign</h3>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Description des modifications</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Ex: MAJ articles 2.4.1, 2.8, 3.1"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={handlePush} disabled={step === "pushing" || !description.trim()}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {step === "pushing" ? "Push en cours..." : "Pousser dans DocuSign"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && pushData && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Push DocuSign terminé</h2>
              <p className="text-sm text-gray-400 mt-1">
                Version {pushData.version_number} — {pushData.description}
              </p>
            </div>

            <div className="space-y-2">
              {pushData.results.map(c => (
                <div key={c.code} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${c.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-medium text-gray-800">{c.code}</span>
                  </div>
                  {c.powerform_url && (
                    <a href={c.powerform_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-violet-600 hover:underline">PowerForm</a>
                  )}
                </div>
              ))}
            </div>

            {pushData.errors.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                {pushData.errors.map(e => (
                  <p key={e.code} className="text-sm text-red-600">{e.code} : {e.error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </main>
    </div>
  );
}
