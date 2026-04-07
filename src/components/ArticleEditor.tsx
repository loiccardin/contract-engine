"use client";

import { useState } from "react";
import { Article } from "@/types";
import VariantTabs from "./VariantTabs";

interface ArticleEditorProps {
  article: Article;
  token: string;
}

export default function ArticleEditor({ article: initial, token }: ArticleEditorProps) {
  const [article, setArticle] = useState<Article>(initial);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFieldChange(field: keyof Article, value: string | null) {
    setArticle((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(article),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Erreur inconnue");
        return;
      }

      setArticle(data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  const scopeLabel: Record<string, string> = {
    common: "Commun",
    commission: "Par commission",
    statut: "Par statut",
    menage: "Par ménage",
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-gray-900">{article.title}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
          {scopeLabel[article.scope] || article.scope}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-200">
          <VariantTabs
            scope={article.scope}
            article={article}
            onChange={handleFieldChange}
          />

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>

            {saved && (
              <span className="text-sm text-green-600 font-medium">
                Sauvegardé
              </span>
            )}
            {error && (
              <span className="text-sm text-red-600 font-medium">{error}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
