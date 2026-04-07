"use client";

import { useState, useRef } from "react";
import { Article } from "@/types";
import VariantTabs from "./VariantTabs";

const SCOPE_STYLE: Record<string, { badge: string; border: string; label: string }> = {
  common:     { badge: "bg-emerald-50 text-emerald-700", border: "border-l-emerald-400", label: "Commun" },
  commission: { badge: "bg-violet-50 text-violet-700",   border: "border-l-violet-400",  label: "Par commission" },
  statut:     { badge: "bg-blue-50 text-blue-700",       border: "border-l-blue-400",     label: "Par statut" },
  menage:     { badge: "bg-amber-50 text-amber-700",     border: "border-l-amber-400",    label: "Par ménage" },
};

interface ArticleEditorProps {
  article: Article;
  token: string;
}

export default function ArticleEditor({ article: initial, token }: ArticleEditorProps) {
  const [article, setArticle] = useState<Article>(initial);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef(JSON.stringify(initial));

  function handleFieldChange(field: keyof Article, value: string | null) {
    const next = { ...article, [field]: value };
    setArticle(next);
    setDirty(JSON.stringify(next) !== savedRef.current);
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
      savedRef.current = JSON.stringify(data.data);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  const style = SCOPE_STYLE[article.scope] || SCOPE_STYLE.common;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md overflow-hidden ${
        isOpen ? `border-l-4 ${style.border}` : ""
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-gray-800 truncate">{article.title}</span>
          {dirty && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Modifications non sauvegardées" />
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-3 ${style.badge}`}>
          {style.label}
        </span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-gray-100">
          <VariantTabs
            scope={article.scope}
            article={article}
            onChange={handleFieldChange}
          />

          <div className="flex items-center gap-3 mt-4">
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </button>
            )}

            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium animate-fade-in">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Sauvegardé
              </span>
            )}
            {error && (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
