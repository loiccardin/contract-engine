export interface Article {
  id: number;
  code: string;
  title: string;
  orderIndex: number;
  scope: "common" | "commission" | "statut" | "menage";
  contentCommon: string | null;
  contentClassique: string | null;
  contentStudio: string | null;
  content20pct: string | null;
  contentParticulier: string | null;
  contentSociete: string | null;
  contentZonesCj: string | null;
  contentZonesR: string | null;
  contentSansMenage: string | null;
  isPageBreakBefore: boolean;
  keepTogether: boolean;
  updatedAt: string;
}

export interface Contract {
  id: number;
  code: string;
  commissionType: "classique" | "studio" | "20pct";
  statutType: "particulier" | "societe";
  menageType: "zones_cj" | "zones_r" | "sans_menage";
  googleDocId: string | null;
  docusignTemplateName: string | null;
  docusignPowerformId: string | null;
  docusignTemplateId: string | null;
}

export interface AssembledArticle {
  code: string;
  title: string;
  content: string;
  orderIndex: number;
  isPageBreakBefore: boolean;
  keepTogether: boolean;
  sectionNumber: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
