"use client";

import { useEffect, useState } from "react";
import { Article, ApiResponse } from "@/types";
import StepIndicator from "@/components/StepIndicator";
import ArticleEditor from "@/components/ArticleEditor";
import LogoutButton from "@/components/LogoutButton";
import { useAuth } from "@/components/AuthProvider";

export default function EditorPage() {
  const { apiCall } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  async function loadArticles(bearerToken: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await apiCall("/api/articles", {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });

      const data: ApiResponse<Article[]> = await res.json();

      if (!data.success) {
        setError(data.error || "Erreur inconnue");
        return;
      }

      setArticles(data.data || []);
      setAuthenticated(true);
    } catch {
      setError("Erreur réseau — impossible de charger les articles");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (token.trim()) {
      localStorage.setItem("app_token", token.trim());
      loadArticles(token.trim());
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("app_token");
    if (saved) {
      setToken(saved);
      loadArticles(saved);
    } else {
      setLoading(false);
    }
  }, []);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Contract Engine
            </h1>
            <p className="text-sm text-gray-500 mt-1">Plateforme de gestion des contrats</p>
          </div>

          <form
            onSubmit={handleLogin}
            className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200"
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token d&apos;acces
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400"
              placeholder="Collez votre APP_SECRET"
            />
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
              Contract Engine
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <StepIndicator currentStep={1} />
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
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Articles du template
          </h2>
          <p className="text-sm text-gray-500 mt-1.5">
            {articles.length} article{articles.length !== 1 ? "s" : ""} — Cliquez pour modifier, puis enregistrez.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {articles.length === 0 && !loading && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-600">Aucun article</p>
            <p className="text-sm text-gray-400 mt-1">Executez le seed pour importer les articles.</p>
          </div>
        )}

        <div className="space-y-3">
          {articles.map((article) => (
            <ArticleEditor
              key={article.id}
              article={article}
              token={token}
            />
          ))}
        </div>

        {articles.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-200 flex justify-end">
            <a href="/generate"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md">
              Passer a la generation
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
