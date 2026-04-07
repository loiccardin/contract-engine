export interface ContractVariant {
  code: string;
  commissionType: "classique" | "studio" | "20pct";
  statutType: "particulier" | "societe";
  menageType: "zones_cj" | "zones_r" | "sans_menage";
}

export const CONTRACT_VARIANTS: ContractVariant[] = [
  // Classique (P1 = avec ménage, P2 = sans ménage)
  { code: "P1.P.CJ", commissionType: "classique", statutType: "particulier", menageType: "zones_cj" },
  { code: "P1.P.R",  commissionType: "classique", statutType: "particulier", menageType: "zones_r" },
  { code: "P1.S.CJ", commissionType: "classique", statutType: "societe",     menageType: "zones_cj" },
  { code: "P1.S.R",  commissionType: "classique", statutType: "societe",     menageType: "zones_r" },
  { code: "P2.P",    commissionType: "classique", statutType: "particulier", menageType: "sans_menage" },
  { code: "P2.S",    commissionType: "classique", statutType: "societe",     menageType: "sans_menage" },

  // Studio (P3 = avec ménage, P4 = sans ménage)
  { code: "P3.P.CJ", commissionType: "studio", statutType: "particulier", menageType: "zones_cj" },
  { code: "P3.P.R",  commissionType: "studio", statutType: "particulier", menageType: "zones_r" },
  { code: "P3.S.CJ", commissionType: "studio", statutType: "societe",     menageType: "zones_cj" },
  { code: "P3.S.R",  commissionType: "studio", statutType: "societe",     menageType: "zones_r" },
  { code: "P4.P",    commissionType: "studio", statutType: "particulier", menageType: "sans_menage" },
  { code: "P4.S",    commissionType: "studio", statutType: "societe",     menageType: "sans_menage" },

  // 20% (P5 = avec ménage, P6 = sans ménage)
  { code: "P5.P.CJ", commissionType: "20pct", statutType: "particulier", menageType: "zones_cj" },
  { code: "P5.P.R",  commissionType: "20pct", statutType: "particulier", menageType: "zones_r" },
  { code: "P5.S.CJ", commissionType: "20pct", statutType: "societe",     menageType: "zones_cj" },
  { code: "P5.S.R",  commissionType: "20pct", statutType: "societe",     menageType: "zones_r" },
  { code: "P6.P",    commissionType: "20pct", statutType: "particulier", menageType: "sans_menage" },
  { code: "P6.S",    commissionType: "20pct", statutType: "societe",     menageType: "sans_menage" },
];
