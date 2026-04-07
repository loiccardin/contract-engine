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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-sm"
        >
          <h1 className="text-lg font-semibold text-gray-900 mb-4">
            Contract Engine
          </h1>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Token d&apos;accès
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="APP_SECRET"
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            Contract Engine
          </h1>
          <StepIndicator currentStep={1} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Articles du template
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {articles.length} article{articles.length !== 1 ? "s" : ""} — Modifiez le contenu puis cliquez sur Enregistrer.
          </p>
        </div>

        {articles.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            Aucun article. Exécutez le seed pour importer les articles.
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
