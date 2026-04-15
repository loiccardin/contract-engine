export interface Article {
  id: number;
  code: string;
  title: string;
  orderIndex: number;
  scope: "common" | "commission" | "statut" | "menage" | "duree";
  contentCommon: string | null;
  contentClassique: string | null;
  contentStudio: string | null;
  content20pct: string | null;
  contentParticulier: string | null;
  contentSociete: string | null;
  contentZonesCj: string | null;
  contentZonesR: string | null;
  contentSansMenage: string | null;
  contentStandard: string | null;
  contentCourte: string | null;
  documentType: "all" | "promesse_only" | "contrat_only";
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
  dureeType: "standard" | "courte";
  documentType: "promesse" | "contrat";
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
  /**
   * Recopie le `document_type` de l'article source : utile au generator pour
   * décider, par exemple, de ne pas appliquer `CONTRAT_TEXT_REMAPPING` sur les
   * `contrat_only` (leurs "ANNEXE 1/2" sont déjà la numérotation du contrat).
   */
  articleDocumentType: "all" | "promesse_only" | "contrat_only";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
