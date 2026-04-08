"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StepIndicator from "@/components/StepIndicator";

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
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Contract Engine</h1>
          <StepIndicator currentStep={2} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Idle — bouton générer */}
        {step === "idle" && (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Générer les 18 contrats</h2>
            <p className="text-gray-400 mb-8">Assemble les articles, génère les DOCX et les uploade dans Google Drive.</p>
            <button onClick={handleGenerate}
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
              Générer les 18 DOCX
            </button>
          </div>
        )}

        {/* Generating — spinner */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-600 font-medium">Génération en cours...</p>
            <p className="text-sm text-gray-400 mt-1">18 DOCX — environ 3 minutes</p>
          </div>
        )}

        {/* Review — liste DOCX + bouton push */}
        {(step === "review" || step === "pushing") && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{okCount}/18 DOCX générés</h2>
              <p className="text-sm text-gray-400 mt-1">Vérifiez les documents dans Drive avant de pousser dans DocuSign.</p>
            </div>

            <div className="space-y-2 mb-8">
              {contracts.map(c => (
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

            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                {errors.map(e => <p key={e.code} className="text-sm text-red-600">{e.code} : {e.error}</p>)}
              </div>
            )}

            {step === "pushing" ? (
              <div className="flex flex-col items-center py-8 border-t border-gray-200">
                <svg className="animate-spin w-8 h-8 text-violet-500 mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-gray-600 font-medium">Conversion PDF et push DocuSign en cours...</p>
                <p className="text-sm text-gray-400 mt-1">18 conversions + 18 templates — environ 5 minutes</p>
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-6">
                <button onClick={handlePush} disabled={okCount === 0}
                  className="w-full px-6 py-3 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  Générer les PDFs et pousser dans DocuSign
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </main>
    </div>
  );
}
