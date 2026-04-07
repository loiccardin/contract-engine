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

  if (scope === "common") {
    return (
      <textarea
        className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={(article.contentCommon as string) || ""}
        onChange={(e) => onChange("contentCommon", e.target.value)}
      />
    );
  }

  return <TabsView tabs={tabs} article={article} onChange={onChange} />;
}

function TabsView({
  tabs,
  article,
  onChange,
}: {
  tabs: TabConfig[];
  article: Article;
  onChange: (field: keyof Article, value: string | null) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);

  const currentTab = tabs[activeTab];
  const value = (article[currentTab.key] as string | null) || "";

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-3">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              i === activeTab
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <textarea
        className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={value}
        onChange={(e) => onChange(currentTab.key, e.target.value)}
      />
    </div>
  );
}
