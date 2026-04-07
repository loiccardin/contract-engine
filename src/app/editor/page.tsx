"use client";

import { useEffect, useState } from "react";
import { Article, ApiResponse } from "@/types";
import StepIndicator from "@/components/StepIndicator";
import ArticleEditor from "@/components/ArticleEditor";

export default function EditorPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  async function loadArticles(bearerToken: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/articles", {
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
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 w-full max-w-sm"
        >
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">
              Contract Engine
            </h1>
            <p className="text-sm text-gray-400 mt-1">Gestion des contrats Letahost</p>
          </div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">
            Token d&apos;accès
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
            placeholder="Collez votre APP_SECRET"
          />
          {error && (
            <p className="mt-2.5 text-sm text-red-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            Contract Engine
          </h1>
          <StepIndicator currentStep={1} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">
            Articles du template
          </h2>
          <p className="text-sm text-gray-400 mt-1.5 font-light">
            {articles.length} article{articles.length !== 1 ? "s" : ""} — Cliquez pour modifier, puis enregistrez.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {articles.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Aucun article</p>
            <p className="text-sm mt-1">Exécutez le seed pour importer les articles.</p>
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
      </main>
    </div>
  );
}
