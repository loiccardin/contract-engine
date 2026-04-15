"use client";

import { useState } from "react";
import StepIndicator from "@/components/StepIndicator";
import LogoutButton from "@/components/LogoutButton";
import { useAuth } from "@/components/AuthProvider";

interface ContratResult {
  code: string;
  status: string;
  drive_file_id?: string;
  drive_file_url?: string;
  article_count?: number;
}

interface GenerateResponse {
  generated_at: string;
  folder_id: string;
  folder_url: string;
  archived: string[];
  contracts: ContratResult[];
  errors: { code: string; error: string }[];
}

export default function ContratsPage() {
  const { apiCall } = useAuth();
  const [step, setStep] = useState<"idle" | "generating" | "done">("idle");
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setStep("generating");
    setError(null);
    setData(null);
    try {
      const res = await apiCall("/api/generate-contrats", { method: "POST", headers: {} });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.error);
      setData(payload.data);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStep("idle");
    }
  }

  const okCount = data?.contracts.filter(c => c.status === "ok").length ?? 0;

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
          <div className="flex items-center gap-4">
            <StepIndicator currentStep={4} />
            <a href="/fix" className="text-xs text-gray-400 hover:text-gray-600 transition-colors" title="Correction unitaire">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Idle — bouton generer */}
        {step === "idle" && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-6">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2 tracking-tight">Générer les 24 contrats définitifs</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Assemble les articles en mode contrat, génère les DOCX et les uploade dans Google Drive.
              Pas de DocuSign pour cette étape.
            </p>
            <button onClick={handleGenerate}
              className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md">
              Générer les 24 contrats
            </button>
            {error && <p className="text-sm text-red-600 mt-6">{error}</p>}
          </div>
        )}

        {/* Generating — spinner */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100" />
              <svg className="absolute inset-0 animate-spin w-16 h-16 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-0" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" d="M4 12a8 8 0 018-8" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium mt-6">Génération en cours...</p>
            <p className="text-sm text-gray-500 mt-1">24 DOCX — environ 4 minutes</p>
          </div>
        )}

        {/* Done — liste des résultats */}
        {step === "done" && data && (
          <div>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-1">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Contrats générés</h2>
                  <p className="text-sm text-gray-500">
                    {okCount}/{data.contracts.length} ok — {new Date(data.generated_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
              <a href={data.folder_url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
                Ouvrir le dossier Drive →
              </a>
            </div>

            <div className="space-y-2 mb-8">
              {data.contracts.map(c => (
                <div key={c.code} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3.5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${c.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-medium text-gray-800">{c.code}</span>
                    {c.article_count && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c.article_count} articles</span>}
                  </div>
                  {c.drive_file_url && (
                    <a href={c.drive_file_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline">Voir dans Drive</a>
                  )}
                </div>
              ))}
            </div>

            {data.errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm font-medium text-red-700 mb-1">Erreurs</p>
                {data.errors.map(e => <p key={e.code} className="text-sm text-red-600">{e.code} : {e.error}</p>)}
              </div>
            )}

            <div className="border-t border-gray-200 pt-6 flex justify-center">
              <button onClick={handleGenerate}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Regénérer
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
