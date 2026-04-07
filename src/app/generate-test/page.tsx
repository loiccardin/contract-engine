"use client";

import { useState, useEffect } from "react";
import { CONTRACT_VARIANTS } from "@/config/contracts";

export default function GenerateTestPage() {
  const [code, setCode] = useState(CONTRACT_VARIANTS[0].code);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("app_token");
    if (saved) setToken(saved);
  }, []);

  async function handleGenerate() {
    if (!token) {
      setError("Token requis — connectez-vous d'abord via /editor");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Erreur ${res.status}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${code}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-md">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Test DOCX</h1>
        <p className="text-sm text-gray-400 mb-6">Page temporaire — sera supprimée</p>

        <label className="block text-sm font-medium text-gray-600 mb-1.5">Variante</label>
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CONTRACT_VARIANTS.map((v) => (
            <option key={v.code} value={v.code}>
              {v.code} — {v.commissionType} / {v.statutType} / {v.menageType}
            </option>
          ))}
        </select>

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

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Génération en cours..." : `Générer ${code}.docx`}
        </button>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
