"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StepIndicator from "@/components/StepIndicator";
import LogoutButton from "@/components/LogoutButton";

interface ContractResult {
  code: string;
  status: string;
  googleDocUrl?: string;
  articleCount?: number;
}

export default function GeneratePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"idle" | "generating" | "review" | "pushing">("idle");
  const [contracts, setContracts] = useState<ContractResult[]>([]);
  const [errors, setErrors] = useState<{ code: string; error: string }[]>([]);
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
      setContracts(data.data.contracts);
      setErrors(data.data.errors || []);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStep("idle");
    }
  }

  async function handlePush() {
    setStep("pushing");
    setError(null);
    try {
      const res = await fetch("/api/push-docusign", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      // Store push results for /push page
      sessionStorage.setItem("push_results", JSON.stringify(data.data));
      router.push("/push");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStep("review");
    }
  }

  const okCount = contracts.filter(c => c.status === "ok").length;

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
            <StepIndicator currentStep={2} />
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
            <h2 className="text-2xl font-semibold text-gray-900 mb-2 tracking-tight">Generer les 18 contrats</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Assemble les articles, genere les DOCX et les uploade dans Google Drive.</p>
            <button onClick={handleGenerate}
              className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md">
              Generer les 18 DOCX
            </button>
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
            <p className="text-gray-900 font-medium mt-6">Generation en cours...</p>
            <p className="text-sm text-gray-500 mt-1">18 DOCX — environ 3 minutes</p>
          </div>
        )}

        {/* Review — liste DOCX + bouton push */}
        {(step === "review" || step === "pushing") && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">{okCount}/18 DOCX generes</h2>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${okCount === 18 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {okCount === 18 ? "Complet" : "Partiel"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Verifiez les documents dans Drive avant de pousser dans DocuSign.</p>
            </div>

            <div className="space-y-2 mb-8">
              {contracts.map(c => (
                <div key={c.code} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3.5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${c.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-medium text-gray-800">{c.code}</span>
                    {c.articleCount && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c.articleCount} articles</span>}
                  </div>
                  {c.googleDocUrl && (
                    <a href={c.googleDocUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline">Voir dans Drive</a>
                  )}
                </div>
              ))}
            </div>

            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm font-medium text-red-700 mb-1">Erreurs</p>
                {errors.map(e => <p key={e.code} className="text-sm text-red-600">{e.code} : {e.error}</p>)}
              </div>
            )}

            {step === "pushing" ? (
              <div className="flex flex-col items-center py-10 border-t border-gray-200">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-100" />
                  <svg className="absolute inset-0 animate-spin w-12 h-12 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-0" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" d="M4 12a8 8 0 018-8" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium mt-4">Conversion PDF et push DocuSign en cours...</p>
                <p className="text-sm text-gray-500 mt-1">18 conversions + 18 templates — environ 5 minutes</p>
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-6">
                <button onClick={handlePush} disabled={okCount === 0}
                  className="w-full px-6 py-3.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm hover:shadow-md">
                  Generer les PDFs et pousser dans DocuSign
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
