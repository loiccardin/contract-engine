import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/**
 * Crée les 12 articles "contrat_only" avec leur contenu verbatim issu de
 * references/C1.P.CJ-reference.docx. Les order_index sont alignés sur l'ordre
 * de rendu du contrat C — dans un cas de remplacement, on prend le même
 * order_index que l'article promesse_only correspondant ; dans un cas
 * d'insertion ou d'ajout, on intercale entre deux articles existants.
 *
 * Note: 12 articles (et non 13 comme le brief le mentionne — recompte des
 * 3 remplacés + 2 insertions + 7 nouveaux) — RGPD, législation sociale,
 * imprévision, non-renonciation, droit applicable, mandat débours, mandat SEPA.
 */

interface ContratArticleSpec {
  code: string;
  title: string;
  scope: string;
  contentCommon: string;
  refOrderIndexFromCode?: string; // copier order_index depuis ce code
  orderIndexAfterCode?: string;   // order_index = (parent.orderIndex + 1)
  orderIndex?: number;            // valeur explicite
  isPageBreakBefore?: boolean;
}

// ─── Contenu verbatim DOCX (référence C1.P.CJ) ───

const CONTENT_EN_TETE_PRESTATAIRE_CONTRAT = `ET


Nom société :   ———————
Capital social :  ———————
Siège social :  ———————
RCS : Immatriculée au RCS de  ———————  sous le numéro  ———————
Représentée par Mr  ———————  , dûment habilitée aux présentes.
Téléphone :  ———————
Mail :  ———————


Ci-après désigné « le PRESTATAIRE »
D'AUTRE PART
Ci-après désignées individuellement « la Partie » ou collectivement « les Parties »`;

const CONTENT_OBJET_CONTRAT = `OBJET DU CONTRAT

Le présent document, y compris le préambule et les annexes, constituent le « Contrat ». Ils constituent un ensemble indivisible et non sécable de sorte qu'ils ne sauraient être lus l'un sans les autres.

Par le présent Contrat, le PROPRIÉTAIRE confère à titre exclusif, dans les termes et conditions du Contrat au PRESTATAIRE, qui l'accepte en contrepartie du paiement de la rémunération stipulée à l'article 3 et de toute autre somme qui lui serait due en exécution du présent Contrat. Le présent Contrat a pour objet une mission de prestations de conciergerie dans le cadre de la location en courte durée du LOGEMENT par un ou plusieurs locataires (ci-après désigné comme « le Voyageur »).
Cette mission de conciergerie comprend les services suivants :
- Services de Ménage (tels que définis au paragraphe 2.1) ;
- Services de Linge (tels que définis au paragraphe 2.2) ;
- Service de Conseils de Décoration d'Intérieur (tel que défini au paragraphe 2.3) ;
- Service de Photos avec valorisation immobilière (tel que défini au paragraphe 2.4) ;
- Services de Création des comptes et annonces appartenant au Propriétaire sur les Plateformes de Réservation Sélectionnées (tels que définis au paragraphe 2.5) ;
- Services d'Accueil des Voyageurs (tels que définis au paragraphe 2.6) ;
- Services de Communication avec les Voyageurs via les plateformes / messagerie électronique et / ou téléphone (tels que définis au paragraphe 2.7) ;
- Conseils et Suivi des Prix de nuitées en fonction de l'offre et la demande (Revenue Management) (tels que définis au paragraphe 2.8).
Tout service supplémentaire non désigné à l'article 2 devra faire l'objet d'un avenant écrit au présent Contrat dans des conditions et modalités qui seront définies entre les Parties.
Il est convenu entre les Parties que le PRESTATAIRE dispose de la faculté de déléguer l'exécution d'un ou plusieurs services à un tiers de son choix, sous sa responsabilité. Cette faculté de substitution est de plein droit et ne saurait modifier l'économie générale du présent Contrat.`;

const CONTENT_NULLITE_CONTRAT = `L'annulation de l'une des stipulations du présent Contrat n'entraînerait l'annulation de celui-ci dans son ensemble, que pour autant que la stipulation litigieuse puisse être considérée, dans l'esprit des Parties, comme substantielle et déterminante, et que son annulation remette en cause l'équilibre général de la convention. En cas d'annulation d'une des stipulations du présent Contrat, considérée comme non substantielle, les Parties s'efforceront de négocier une clause économiquement équivalente.`;

const CONTENT_CLAUSE_AVENANT_LOGEMENTS = `Toute modification de la liste des LOGEMENTS confiés au titre du présent Contrat devra faire l'objet d'un avenant écrit entre les Parties.`;

const CONTENT_CLAUSE_SEPA = `À défaut de règlement dans ce délai, le PROPRIÉTAIRE autorise expressément le PRESTATAIRE à procéder au paiement par prélèvement bancaire, en application du mandat SEPA préalablement signé à cet effet qui figurera à l'Annexe 3 du Contrat de Prestation de Services.`;

const CONTENT_RGPD = `9.   PROTECTION DES DONNÉES PERSONNELLES

Le PROPRIÉTAIRE se déclare informé des réglementations relatives aux données personnelles notamment la Loi n°2004-801 du 6 août 2004 relative à la protection des personnes physiques à l'égard des traitements de données à caractère personnel et le Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 relatif à la protection des personnes physiques à l'égard du traitement des données à caractère personnel et à la libre circulation de ces données.

En application de la réglementation suscitée, il est rappelé que les données nominatives demandées à la personne physique représentant le PROPRIÉTAIRE sont nécessaires à l'exécution du contrat.

Les données collectées sont : Prénom et nom de la personne physique ; Adresse email et postale ; Numéro de téléphone ; Date et lieu de naissance ; et Nationalité.

Lorsque que des données personnelles sont nécessaires à la fourniture des services, ou au traitement des demandes du PROPRIÉTAIRE, le fait de ne pas les communiquer peut retarder, voire rendre impossible, le traitement de la demande, la réponse aux questions ainsi que la réalisation de services.

Les données personnelles sont accessibles uniquement aux collaborateurs du PRESTATAIRE et de ses éventuels sous-traitants, aux prestataires de ménage mandatés directement par le PRESTATAIRE, au comptable du PRESTATAIRE, ainsi qu'à toute personne ayant besoin de ces informations pour l'exécution de ses missions. Les données personnelles ne sont communiquées à aucun tiers sauf éventuellement aux sociétés sœurs du PRESTATAIRE notamment dans le cadre de l'exécution des services.

Le PRESTATAIRE pourra devoir transférer des données personnelles à des tiers sur demande des autorités habilitées, conformément aux lois et réglementations en vigueur.

Le PRESTATAIRE s'engage à prendre toutes les précautions nécessaires afin de préserver la sécurité des données personnelles et notamment qu'elles ne soient pas communiquées à des personnes non autorisées. Si un incident impactant l'intégrité ou la confidentialité des données personnelles est porté à la connaissance du PRESTATAIRE, il s'engage à informer le PROPRIÉTAIRE dans les meilleurs délais et lui communiquer les mesures de corrections prises.

Le PRESTATAIRE peut conserver les données personnelles des PROPRIÉTAIRES pendant deux (2) années à compter du consentement des PROPRIÉTAIRES ou jusqu'au retrait de leur consentement. En cas de relation commerciale, les données relatives aux services proposés par le PRESTATAIRE sont conservées trois ans à compter de la fin des relations commerciales ou pour une durée supérieure lorsque le PRESTATAIRE une raison légitime ou légale de les conserver (notamment sans que cette liste soit exhaustive, les données relatives à la facturation).

Conformément à la réglementation, chaque PROPRIÉTAIRE dispose des droits suivants sur ses données :

- Un droit d'accès ;
- Un droit de rectification ;
- Un droit à l'effacement/droit à l'oubli ;
- Un droit à la limitation du traitement ;
- Un droit d'opposition au traitement/ droit de retrait de consentement.

Pour savoir comment le PRESTATAIRE utilise ses données personnelles et/ou exercer ses droits, le PROPRIÉTAIRE doit adresser les demandes au PRESTATAIRE :

- Par courrier au PRESTATAIRE : ———————
- Par email à : ———————

Dans tous les cas, le PROPRIÉTAIRE devra indiquer les données personnelles qu'il souhaiterait que le PRESTATAIRE corrige, mette à jour ou supprime, en s'identifiant précisément avec une copie d'une pièce d'identité. Les demandes de suppression de données personnelles seront soumises aux obligations légales, notamment en matière de conservation ou d'archivage des documents.

Enfin, le PROPRIÉTAIRE peut déposer une réclamation auprès des autorités de contrôle, et notamment de la CNIL (https://www.cnil.fr/fr/plaintes).`;

const CONTENT_LEGISLATION_SOCIALE = `11. SOUS-TRAITANCE – RESPECT DE LA LÉGISLATION SOCIALE

Le PRESTATAIRE est autorisé par le PROPRIÉTAIRE à faire appel à des sous-traitants dans le cadre de l'exécution du présent Contrat sous sa seule responsabilité.

Pendant toute la durée d'exécution du présent Contrat, le PRESTATAIRE garantit être à jour de ses obligations relatives aux déclarations et attestations de chacun de ses sous-traitants, notamment celles visées par les dispositions du Code du travail.`;

const CONTENT_IMPREVISION = `12.1 Chacune des Parties déclare renoncer expressément à se prévaloir des dispositions de l'article 1195 du Code civil et du régime de l'imprévision qui y est prévu, s'engageant à assumer ses obligations même si l'équilibre contractuel se trouve bouleversé par des circonstances qui étaient imprévisibles lors de la conclusion du Contrat, quand bien même leur exécution s'avérerait excessivement onéreuse et à en supporter toutes les conséquences économiques et financières.`;

const CONTENT_NON_RENONCIATION = `12.2 Le fait pour l'une des Parties de ne pas se prévaloir à un moment donné de l'une quelconque des clauses du présent Contrat ne peut valoir renonciation à se prévaloir ultérieurement de ces mêmes clauses.`;

const CONTENT_DROIT_APPLICABLE_CONTRAT = `13. DROIT APPLICABLE - COMPETENCE JURIDICTIONNELLE

De convention expresse entre les Parties, le présent Contrat est régi et soumis au droit français.

Le Contrat est rédigé en langue française. Dans le cas où il serait traduit en une ou plusieurs langues, seul le texte français ferait foi en cas de litige.

Tout litige pouvant résulter de la validité, de l'interprétation, ou de l'exécution du présent Contrat et de ses conséquences sera de la compétence des Tribunaux de Paris.

Le présent Contrat est signé dans le cadre du processus de signature électronique DocuSign conformément aux articles 1366 à 1368 du Code civil et dispose de la même force probante qu'un contrat sur support papier.`;

const CONTENT_ANNEXE_MANDAT_DEBOURS = `ANNEXE 1 : MANDAT DE PAIEMENT POUR LE COMPTE D'UN TIERS

MANDAT DE PAIEMENT POUR LE COMPTE D'UN TIERS (Dans le cadre du régime des débours – Article 267, II-2 du CGI)

ENTRE LES SOUSSIGNÉS

LE PROPRIÉTAIRE
Nom et Prénoms :  ———————
Agissant en qualité d'Entrepreneur Individuel, pour le compte de son entreprise en cours d'immatriculation,
dont le siège social est envisagé à : ———————
Date de naissance :        ———————
Adresse du domicile : ———————
Pays : ———————
Téléphone : ———————
Mail : ———————
Adresse du/des LOGEMENT(s) exploité(s) en location courte durée :
———————

Ci-après désigné « le Mandant »
D'UNE PART

ET

Nom société :   ———————
Capital social :  ———————
Siège social :  ———————
RCS : Immatriculée au RCS de  ———————  sous le numéro  ———————
Représentée par Mr  ———————  , dûment habilitée aux présentes.
Téléphone :  ———————
Mail :  ———————

Ci-après désigné « le Mandataire »
D'AUTRE PART

Article 1 – Objet du mandat
Le Mandant autorise expressément le Mandataire à commander, en son nom et pour son compte, des prestations de services liées à l'exploitation de son LOGEMENT immobilier, notamment des prestations de ménage, blanchisserie ou achat de consommables et produits d'entretiens.
Le Mandataire est expressément autorisé à avancer les paiements correspondants auxdites prestations, à condition que les factures soient établies au nom du Mandant.

Article 2 – Modalités financières
Le Mandataire ne facturera pas ces prestations au Mandant, mais lui transmettra la ou les factures originales des prestataires. Le Mandant s'engage à rembourser à l'euro près les sommes avancées sur présentation des justificatifs.
Ces sommes ne seront pas considérées comme du chiffre d'affaires pour le Mandataire, conformément au régime des débours.

Article 3 – Durée
Le présent mandat est conclu pour toute la durée du Contrat de conciergerie signé entre le Mandant (le Propriétaire) et le Mandataire (le Prestataire).
Il prendra automatiquement fin à la date de résiliation ou d'expiration dudit contrat, sauf renouvellement exprès.

Fait à
le :  En deux exemplaires originaux.

Signature du Mandant : (Signature + mention "Bon pour accord")


Signature du Mandataire : (Signature + mention "Bon pour accord")`;

const CONTENT_ANNEXE_MANDAT_SEPA = `ANNEXE 3 : MANDAT SEPA`;

// ─── Spec ───

const SPECS: ContratArticleSpec[] = [
  {
    code: "en_tete_prestataire_contrat",
    title: "En-tête prestataire (contrat)",
    scope: "common",
    contentCommon: CONTENT_EN_TETE_PRESTATAIRE_CONTRAT,
    refOrderIndexFromCode: "en_tete_prestataire",
  },
  {
    code: "art_clause_avenant_logements",
    title: "Avenant pour modification de la liste des logements",
    scope: "common",
    contentCommon: CONTENT_CLAUSE_AVENANT_LOGEMENTS,
    orderIndexAfterCode: "preambule",
  },
  {
    code: "art_objet_contrat",
    title: "Objet du contrat",
    scope: "common",
    contentCommon: CONTENT_OBJET_CONTRAT,
    refOrderIndexFromCode: "art_1_1",
  },
  {
    code: "art_clause_sepa",
    title: "Clause prélèvement SEPA",
    scope: "common",
    contentCommon: CONTENT_CLAUSE_SEPA,
    orderIndexAfterCode: "art_2_4_1_taux",
  },
  {
    code: "art_rgpd",
    title: "Protection des données personnelles",
    scope: "common",
    contentCommon: CONTENT_RGPD,
    orderIndex: 275, // entre art_2_8 (270) et art_2_9 confidentialité (280)
  },
  {
    code: "art_legislation_sociale",
    title: "Sous-traitance – Respect de la législation sociale",
    scope: "common",
    contentCommon: CONTENT_LEGISLATION_SOCIALE,
    orderIndex: 295, // après art_2_10 (290)
  },
  {
    code: "art_imprevision",
    title: "Imprévision",
    scope: "common",
    contentCommon: CONTENT_IMPREVISION,
    orderIndex: 296,
  },
  {
    code: "art_non_renonciation",
    title: "Non-renonciation",
    scope: "common",
    contentCommon: CONTENT_NON_RENONCIATION,
    orderIndex: 297,
  },
  {
    code: "art_nullite_contrat",
    title: "Nullité des clauses",
    scope: "common",
    contentCommon: CONTENT_NULLITE_CONTRAT,
    refOrderIndexFromCode: "art_5",
  },
  {
    code: "art_droit_applicable_contrat",
    title: "Droit applicable – Compétence juridictionnelle",
    scope: "common",
    contentCommon: CONTENT_DROIT_APPLICABLE_CONTRAT,
    refOrderIndexFromCode: "art_7",
  },
  {
    code: "annexe_mandat_debours",
    title: "Annexe — Mandat de paiement pour le compte d'un tiers",
    scope: "common",
    contentCommon: CONTENT_ANNEXE_MANDAT_DEBOURS,
    orderIndex: 375, // avant annexe_1 (380)
    isPageBreakBefore: true,
  },
  {
    code: "annexe_mandat_sepa",
    title: "Annexe — Mandat SEPA",
    scope: "common",
    contentCommon: CONTENT_ANNEXE_MANDAT_SEPA,
    orderIndex: 385, // entre annexe_1 (380) et annexe_2 (390)
    isPageBreakBefore: true,
  },
];

async function resolveOrderIndex(spec: ContratArticleSpec): Promise<number> {
  if (spec.orderIndex !== undefined) return spec.orderIndex;
  if (spec.refOrderIndexFromCode) {
    const ref = await prisma.article.findUnique({
      where: { code: spec.refOrderIndexFromCode },
      select: { orderIndex: true },
    });
    if (!ref) throw new Error(`ref code introuvable: ${spec.refOrderIndexFromCode}`);
    return ref.orderIndex;
  }
  if (spec.orderIndexAfterCode) {
    const parent = await prisma.article.findUnique({
      where: { code: spec.orderIndexAfterCode },
      select: { orderIndex: true },
    });
    if (!parent) throw new Error(`parent code introuvable: ${spec.orderIndexAfterCode}`);
    return parent.orderIndex + 1;
  }
  throw new Error(`spec ${spec.code}: aucun orderIndex fourni`);
}

async function main() {
  for (const spec of SPECS) {
    const orderIndex = await resolveOrderIndex(spec);
    const data = {
      code: spec.code,
      title: spec.title,
      orderIndex,
      scope: spec.scope,
      contentCommon: spec.contentCommon,
      documentType: "contrat_only",
      isPageBreakBefore: spec.isPageBreakBefore ?? false,
      keepTogether: true,
    };

    await prisma.article.upsert({
      where: { code: spec.code },
      update: {
        title: data.title,
        orderIndex: data.orderIndex,
        scope: data.scope,
        contentCommon: data.contentCommon,
        documentType: data.documentType,
        isPageBreakBefore: data.isPageBreakBefore,
        keepTogether: data.keepTogether,
      },
      create: data,
    });
    console.log(`  ${String(orderIndex).padStart(4)} | ${spec.code.padEnd(32)} | ${spec.title}`);
  }

  const counts = await prisma.article.groupBy({
    by: ["documentType"],
    _count: true,
  });
  console.log("\nRépartition document_type:");
  for (const c of counts.sort((a, b) => a.documentType.localeCompare(b.documentType))) {
    console.log(`  ${c.documentType.padEnd(15)} ${c._count}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
