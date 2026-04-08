"use client";

import { useState, useEffect } from "react";
import { CONTRACT_VARIANTS } from "@/config/contracts";

export default function GenerateTestPage() {
  const [code, setCode] = useState(CONTRACT_VARIANTS[0].code);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("app_token");
    if (saved) setToken(saved);
  }, []);

  async function download(url: string, body: string, filename: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Erreur ${res.status}`);
    }

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleGenerate() {
    if (!token) { setError("Token requis"); return; }
    setLoading(true);
    setError(null);
    try {
      await download("/api/generate-test", JSON.stringify({ code }), `${code}.docx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAll() {
    if (!token) { setError("Token requis"); return; }
    setLoadingAll(true);
    setError(null);
    setProgress("Génération des 18 DOCX + ZIP...");
    try {
      const date = new Date().toISOString().slice(0, 10);
      await download("/api/generate-test-all", "{}", `contrats-${date}.zip`);
      setProgress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
      setProgress("");
    } finally {
      setLoadingAll(false);
    }
  }

  const busy = loading || loadingAll;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-md">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Test DOCX</h1>
        <p className="text-sm text-gray-400 mb-6">Page temporaire — sera supprimée</p>

        {!token && (
          <>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="APP_SECRET"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </>
        )}

        <label className="block text-sm font-medium text-gray-600 mb-1.5">Variante individuelle</label>
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CONTRACT_VARIANTS.map((v) => (
            <option key={v.code} value={v.code}>
              {v.code} — {v.commissionType} / {v.statutType} / {v.menageType}
            </option>
          ))}
        </select>

        <button
          onClick={handleGenerate}
          disabled={busy}
          className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors mb-4"
        >
          {loading ? "Génération..." : `Générer ${code}.docx`}
        </button>

        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={handleGenerateAll}
            disabled={busy}
            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loadingAll ? "Génération en cours..." : "Télécharger tous les 18 DOCX (.zip)"}
          </button>
          {progress && <p className="mt-2 text-sm text-blue-600 text-center">{progress}</p>}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
