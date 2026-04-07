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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
