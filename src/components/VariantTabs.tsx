"use client";

import { useState } from "react";
import { Article } from "@/types";

interface TabConfig {
  key: keyof Article;
  label: string;
}

const TABS_BY_SCOPE: Record<string, TabConfig[]> = {
  common: [{ key: "contentCommon", label: "Commun" }],
  commission: [
    { key: "contentClassique", label: "Classique" },
    { key: "contentStudio", label: "Studio" },
    { key: "content20pct", label: "20%" },
  ],
  statut: [
    { key: "contentParticulier", label: "Particulier" },
    { key: "contentSociete", label: "Société" },
  ],
  menage: [
    { key: "contentZonesCj", label: "Zones CJ" },
    { key: "contentZonesR", label: "Zones Rouges" },
    { key: "contentSansMenage", label: "Sans ménage" },
  ],
};

const SCOPE_COLORS: Record<string, { dot: string; active: string; ring: string }> = {
  common: { dot: "bg-emerald-500", active: "border-emerald-500 text-emerald-700", ring: "focus:ring-emerald-400" },
  commission: { dot: "bg-violet-500", active: "border-violet-500 text-violet-700", ring: "focus:ring-violet-400" },
  statut: { dot: "bg-blue-500", active: "border-blue-500 text-blue-700", ring: "focus:ring-blue-400" },
  menage: { dot: "bg-amber-500", active: "border-amber-500 text-amber-700", ring: "focus:ring-amber-400" },
};

interface VariantTabsProps {
  scope: Article["scope"];
  article: Article;
  onChange: (field: keyof Article, value: string | null) => void;
}

export default function VariantTabs({
  scope,
  article,
  onChange,
}: VariantTabsProps) {
  const tabs = TABS_BY_SCOPE[scope] || TABS_BY_SCOPE.common;
  const colors = SCOPE_COLORS[scope] || SCOPE_COLORS.common;

  if (scope === "common") {
    return (
      <textarea
        className={`w-full min-h-[220px] p-4 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent focus:bg-white transition-colors`}
        value={(article.contentCommon as string) || ""}
        onChange={(e) => onChange("contentCommon", e.target.value)}
      />
    );
  }

  return <TabsView tabs={tabs} article={article} onChange={onChange} scope={scope} />;
}

function TabsView({
  tabs,
  article,
  onChange,
  scope,
}: {
  tabs: TabConfig[];
  article: Article;
  onChange: (field: keyof Article, value: string | null) => void;
  scope: string;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const colors = SCOPE_COLORS[scope] || SCOPE_COLORS.common;

  const currentTab = tabs[activeTab];
  const value = (article[currentTab.key] as string | null) || "";
  const isNull = article[currentTab.key] === null;

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(i)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              i === activeTab
                ? colors.active
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${i === activeTab ? colors.dot : "bg-gray-300"}`} />
            {tab.label}
          </button>
        ))}
      </div>
      {isNull ? (
        <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-sm text-gray-400">
          Absent de cette variante (NULL)
        </div>
      ) : (
        <textarea
          className={`w-full min-h-[220px] p-4 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent focus:bg-white transition-colors`}
          value={value}
          onChange={(e) => onChange(currentTab.key, e.target.value)}
        />
      )}
    </div>
  );
}
