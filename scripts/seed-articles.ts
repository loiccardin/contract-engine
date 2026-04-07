import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ArticleData {
  code: string;
  title: string;
  orderIndex: number;
  scope: string;
  contentCommon?: string | null;
  contentParticulier?: string | null;
  contentSociete?: string | null;
  contentZonesCj?: string | null;
  contentZonesR?: string | null;
  contentSansMenage?: string | null;
  contentClassique?: string | null;
  contentStudio?: string | null;
  content20pct?: string | null;
}

const articles: ArticleData[] = [
  // 1. en_tete_titre
  {
    code: "en_tete_titre",
    title: "En-tête et titre du contrat",
    orderIndex: 10,
    scope: "common",
    contentCommon: `PROMESSE DE CONTRAT
DE PRESTATION DE SERVICES
CONCIERGERIE


ENTRE LES SOUSSIGNÉS`,
  },

  // 2. en_tete_proprietaire
  {
    code: "en_tete_proprietaire",
    title: "En-tête propriétaire",
    orderIndex: 20,
    scope: "statut",
    contentParticulier: `LE PROPRIÉTAIRE
Nom et Prénoms :
Agissant en qualité d'Entrepreneur Individuel, pour le compte de son entreprise en cours d'immatriculation,
dont le siège social est envisagé à :
Date de naissance :
Adresse du domicile :
Pays :
Téléphone :
Mail :
Adresse du/des LOGEMENT(s) exploité(s) en location courte durée :



Ci-après désigné « le PROPRIÉTAIRE »
D'UNE PART`,
    contentSociete: `LE PROPRIÉTAIRE
Nom et Prénoms ou Forme et Dénomination :
Date de naissance :
Adresse du domicile ou Siège social  :
Pays :
Numéro SIREN :
Représentée par                                                    , dûment habilitée aux présentes.
Téléphone :
Mail :

Adresse du/des LOGEMENT(s) exploité(s) en location courte durée :



Ci-après désigné « le PROPRIÉTAIRE »
D'UNE PART`,
  },

  // 3. en_tete_prestataire
  {
    code: "en_tete_prestataire",
    title: "En-tête prestataire",
    orderIndex: 30,
    scope: "common",
    contentCommon: `ET

LETAHOST LLC
Société à responsabilité limitée de droit de l'État du Wyoming (États-Unis)
Principal établissement : 30 N Gould St Ste N, Sheridan, WY 82801 (États-Unis)
Immatriculée dans l'État du Wyoming sous le numéro 2025-001753931.
Représentée par Monsieur Loïc CARDIN, dûment habilité aux présentes.


Ci-après désigné « le PRESTATAIRE »
D'AUTRE PART
Ci-après désignées individuellement « la Partie » ou collectivement « les Parties »`,
  },

  // 4. preambule
  {
    code: "preambule",
    title: "Préambule",
    orderIndex: 40,
    scope: "common",
    contentCommon: `IL EST PRÉALABLEMENT RAPPELÉ QUE :
Le PRESTATAIRE est une société spécialisée dans le secteur de la conciergerie au service de professionnels mettant les LOGEMENTS immobiliers dont ils sont propriétaires par contrat en location de courte durée.
Le PROPRIÉTAIRE détient en propre, a reçu mandat ou a été mandaté par d'autres PROPRIÉTAIRES pour la gestion d'un ou plusieurs LOGEMENTS immobiliers dont la désignation suit et dont il entend confier une mission de conciergerie au PRESTATAIRE dans le cadre de la location de courte durée :
Adresse et description précise du/des LOGEMENT(s) appartenant au PROPRIÉTAIRE concerné(s) par la location courte durée :


Ci-après désigné(s) collectivement ou individuellement « le LOGEMENT ».
Il appartient au PROPRIÉTAIRE détenant un mandat d'en justifier au PRESTATAIRE avant la signature du présent Contrat.
Dans ce contexte, les Parties se sont rapprochées afin de définir les conditions et modalités selon lesquelles le PROPRIÉTAIRE envisage de confier au PRESTATAIRE, par la signature ultérieure d'un contrat définitif de prestations de services de conciergerie, une mission portant sur le ou les LOGEMENT(S).


CECI EXPOSÉ, IL A ÉTÉ CONVENU CE QUI SUIT :`,
  },

  // 5. art_1_1
  {
    code: "art_1_1",
    title: "Consentement au Contrat de Prestation de Services",
    orderIndex: 50,
    scope: "common",
    contentCommon: `ARTICLE 1 - PROMESSE DE CONTRAT DE PRESTATION DE SERVICES

1.1. Consentement au Contrat de Prestation de Services

Par le présent Contrat, le PROPRIÉTAIRE s'engage, aux prix, charges et conditions stipulés à l'article 2 ci-après, à confier une mission de conciergerie au PRESTATAIRE, ou à toute entité susceptible de s'y substituer aux fins des présentes, conformément aux dispositions de l'article 1.3, dans le cadre de l'exploitation du Logement en location de courte durée.

À cet effet, le PROPRIÉTAIRE s'engage à conclure un contrat de prestation de services reprenant les conditions définies à ci-après à l'article 2 (ci-après le « Contrat de Prestation de Services ») avec le PRESTATAIRE, ou toute entité venant à s'y substituer aux fins des présentes, au plus tard dans un délai de cent quatre-vingts (180) jours à compter de la date de signature de la présente promesse.


Il est expressément convenu que la présente Promesse, consentie par le PROPRIÉTAIRE, a pour objet de permettre au PRESTATAIRE d'étudier la possibilité de mettre en œuvre une prestation de services de conciergerie pour le LOGEMENT et d'engager les missions nécessaires, telles que définies à l'article 2.`,
  },

  // 6. art_1_2
  {
    code: "art_1_2",
    title: "Portée du consentement",
    orderIndex: 60,
    scope: "common",
    contentCommon: `1.2. Portée du consentement

Le PROPRIÉTAIRE déclare et garantit sur l'honneur que :

-            Il bénéficie de l'ensemble des autorisations requises pour mettre le Logement en location, et notamment qu'aucune disposition légale, réglementaire, contractuelle (y compris le règlement de copropriété) ou autre, ni aucun arrêté municipal, ne limite ou ne fait obstacle à sa capacité à louer le LOGEMENT et à confier au PRESTATAIRE, ou à toute entité susceptible de s'y substituer conformément à l'article 1.3, une mission de conciergerie dans les conditions prévues à l'article 2, ni n'est de nature à empêcher l'exécution de ladite mission ;

-            Il dispose de la pleine capacité juridique et de tous pouvoirs nécessaires pour signer la présente Promesse ainsi que le Contrat de Prestation de Services définitif ;

-            La mise en location du LOGEMENT est conforme à sa destination, n'affecte pas son usage, et qu'il a effectué l'ensemble des déclarations et formalités éventuellement requises par les lois et règlements en vigueur ;

-            Le LOGEMENT est régulièrement couvert par une assurance habitation en cours de validité, couvrant également les dommages susceptibles d'être causés par des tiers ;

-            Il consent expressément à la présente Promesse et s'engage à signer le Contrat de Prestation de Services avec le PRESTATAIRE, ou toute entité venant à s'y substituer dans les conditions prévues à l'article 1.3, ce qu'il reconnaît expressément ;

-            Il accepte expressément qu'en cas d'inexécution de l'une quelconque des obligations mises à sa charge aux termes de la présente Promesse, il puisse être tenu au versement d'une indemnité forfaitaire, à la demande du PRESTATAIRE, dans les conditions prévues à l'article 3.2 du présent Contrat.`,
  },

  // 7. art_1_3
  {
    code: "art_1_3",
    title: "Faculté de substitution du prestataire",
    orderIndex: 70,
    scope: "common",
    contentCommon: `1.3. Faculté de substitution du PRESTATAIRE

Le PRESTATAIRE pourra se faire substituer, pour l'exécution de la présente Promesse, par toute autre personne morale immatriculée en France exerçant l'activité de conciergerie, désignée à cet effet préalablement à la conclusion du Contrat de Prestation de Services avec le PROPRIÉTAIRE, lequel accepte expressément cette substitution. Le PROPRIÉTAIRE sera alors engagé uniquement envers le tiers substitué intervenant lors de la signature du Contrat définitif de Prestation de Services.`,
  },

  // 8. art_1_4
  {
    code: "art_1_4",
    title: "Faculté de rétractation du propriétaire",
    orderIndex: 80,
    scope: "common",
    contentCommon: `1.4 Faculté de rétractation du PROPRIÉTAIRE


Le PROPRIÉTAIRE bénéficie d'une faculté de rétractation lui permettant de résilier la Promesse sans pénalité dans un délai de quatorze (14) jours à compter de sa signature.
Le PROPRIÉTAIRE souhaitant exercer cette faculté devra notifier sa décision au PRESTATAIRE par écrit par un courrier recommandé avec accusé de réception. La notification devra préciser la date à laquelle la rétractation est exercée et mentionner les références du contrat concerné.
En cas d'exercice de la faculté de rétractation, les Parties conviennent de mettre fin immédiatement à l'exécution des obligations contractuelles résultant de la Promesse et procéder à la restitution de tous documents ou informations échangés dans le cadre de la Promesse, dans un délai de dix (10) jours suivant la notification du PROPRIÉTAIRE.
Aucune autre conséquence financière, indemnitaire ou contractuelle ne pourra être imputée au PROPRIÉTAIRE ayant exercé sa faculté de rétractation.`,
  },

  // 9. art_2_1
  {
    code: "art_2_1",
    title: "Objet du contrat définitif",
    orderIndex: 90,
    scope: "menage",
    contentZonesCj: `ARTICLE 2 – CONTENU DU CONTRAT DE PRESTATION DE SERVICES DÉFINITIF

2.1. Objet du contrat définitif

Le PROPRIÉTAIRE confère à titre exclusif, dans les termes et conditions définis ci-après, qui l'accepte en contrepartie du paiement de la rémunération stipulée à l'article 2.3 et de toute autre somme qui lui serait due en exécution du Contrat de Prestation de Services. Le Contrat de Prestation de Services a pour objet une mission de prestations de conciergerie dans le cadre de la location en courte durée du LOGEMENT par un ou plusieurs locataires (ci-après désigné comme « le Voyageur »).

Cette mission de conciergerie comprend les services suivants :

·           Services de Ménage (tels que définis au paragraphe 2.2.1) ;
·           Services de Linge (tels que définis au paragraphe 2.2.2) ;
·           Service de Conseils de Décoration d'Intérieur (tel que défini au paragraphe 2.2.3) ;
·           Service de Photos avec valorisation immobilière (tel que défini au paragraphe 2.2.4) ;
·           Services de Création des comptes et annonces appartenant au Propriétaire sur les Plateformes de Réservation Sélectionnées (tels que définis au paragraphe 2.2.5) ;
·           Services d'Accueil des Voyageurs (tels que définis au paragraphe 2.2.6) ;
·           Services de Communication avec les Voyageurs via les plateformes / messagerie électronique et / ou téléphone (tels que définis au paragraphe 2.2.7) ;
·           Conseils et Suivi des Prix de nuitées en fonction de l'offre et la demande (Revenue Management) (tels que définis au paragraphe 2.2.8).

Tout service supplémentaire non désigné à l'article 2.2 devra faire l'objet d'un avenant écrit dans des conditions et modalités qui seront définies entre les Parties.

Il est convenu entre les Parties que le PRESTATAIRE dispose de la faculté de déléguer l'exécution d'un ou plusieurs services à un tiers de son choix, sous sa responsabilité. Cette faculté de substitution est de plein droit et ne saurait modifier l'économie générale du Contrat de Prestation de Services.`,
    contentZonesR: `ARTICLE 2 – CONTENU DU CONTRAT DE PRESTATION DE SERVICES DÉFINITIF

2.1. Objet du contrat définitif

Le PROPRIÉTAIRE confère à titre exclusif, dans les termes et conditions définis ci-après, qui l'accepte en contrepartie du paiement de la rémunération stipulée à l'article 2.3 et de toute autre somme qui lui serait due en exécution du Contrat de Prestation de Services. Le Contrat de Prestation de Services a pour objet une mission de prestations de conciergerie dans le cadre de la location en courte durée du LOGEMENT par un ou plusieurs locataires (ci-après désigné comme « le Voyageur »).

Cette mission de conciergerie comprend les services suivants :

·           Services de Ménage (tels que définis au paragraphe 2.2.1) ;
·           Services de Linge (tels que définis au paragraphe 2.2.2) ;
·           Service de Conseils de Décoration d'Intérieur (tel que défini au paragraphe 2.2.3) ;
·           Service de Photos avec valorisation immobilière (tel que défini au paragraphe 2.2.4) ;
·           Services de Création des comptes et annonces appartenant au Propriétaire sur les Plateformes de Réservation Sélectionnées (tels que définis au paragraphe 2.2.5) ;
·           Services d'Accueil des Voyageurs (tels que définis au paragraphe 2.2.6) ;
·           Services de Communication avec les Voyageurs via les plateformes / messagerie électronique et / ou téléphone (tels que définis au paragraphe 2.2.7) ;
·           Conseils et Suivi des Prix de nuitées en fonction de l'offre et la demande (Revenue Management) (tels que définis au paragraphe 2.2.8).

Tout service supplémentaire non désigné à l'article 2.2 devra faire l'objet d'un avenant écrit dans des conditions et modalités qui seront définies entre les Parties.

Il est convenu entre les Parties que le PRESTATAIRE dispose de la faculté de déléguer l'exécution d'un ou plusieurs services à un tiers de son choix, sous sa responsabilité. Cette faculté de substitution est de plein droit et ne saurait modifier l'économie générale du Contrat de Prestation de Services.`,
    contentSansMenage: `ARTICLE 2 – CONTENU DU CONTRAT DE PRESTATION DE SERVICES DÉFINITIF

2.1. Objet du contrat définitif

Le PROPRIÉTAIRE confère à titre exclusif, dans les termes et conditions définis ci-après, qui l'accepte en contrepartie du paiement de la rémunération stipulée à l'article 2.3 et de toute autre somme qui lui serait due en exécution du Contrat de Prestation de Services. Le Contrat de Prestation de Services a pour objet une mission de prestations de conciergerie dans le cadre de la location en courte durée du LOGEMENT par un ou plusieurs locataires (ci-après désigné comme « le Voyageur »).

Cette mission de conciergerie comprend les services suivants :

·           Service de Conseils de Décoration d'Intérieur (tel que défini au paragraphe 2.2.1) ;
·           Service de Photos avec valorisation immobilière (tel que défini au paragraphe 2.2.2) ;
·           Services de Création des comptes et annonces appartenant au Propriétaire sur les Plateformes de Réservation Sélectionnées (tels que définis au paragraphe 2.2.3) ;
·           Services d'Accueil des Voyageurs (tels que définis au paragraphe 2.2.4) ;
·           Services de Communication avec les Voyageurs via les plateformes / messagerie électronique et / ou téléphone (tels que définis au paragraphe 2.2.5) ;
·           Conseils et Suivi des Prix de nuitées en fonction de l'offre et la demande (Revenue Management) (tels que définis au paragraphe 2.2.6).

Tout service supplémentaire non désigné à l'article 2.2 devra faire l'objet d'un avenant écrit dans des conditions et modalités qui seront définies entre les Parties.

Il est convenu entre les Parties que le PRESTATAIRE dispose de la faculté de déléguer l'exécution d'un ou plusieurs services à un tiers de son choix, sous sa responsabilité. Cette faculté de substitution est de plein droit et ne saurait modifier l'économie générale du Contrat de Prestation de Services.`,
  },

  // 10. art_2_2_1_menage
  {
    code: "art_2_2_1_menage",
    title: "Services de ménage",
    orderIndex: 100,
    scope: "menage",
    contentZonesCj: `2.2. Services assurés par le prestataire

2.2.1. Services de Ménage

2.2.1.1. Services de ménage effectués avant le séjour d'un ou plusieurs Voyageur(s) et les consommables fournis

Sous réserve des stipulations figurant au paragraphe 2.2.1.3. ci-dessous, le PRESTATAIRE s'engage à :

* Retirer tous les déchets, les assiettes et couverts dans chaque pièce du LOGEMENT utilisés par le(s) précédent(s) Voyageur(s) (le cas échéant).
* Effectuer un nettoyage ordinaire de toute la surface du LOGEMENT (y compris réfrigérateur, micro-onde, tables, plan de travail de la cuisine et miroirs).
* Nettoyer la salle de bain, les lavabos, les toilettes, etc.
* Faire les lits utilisés par le(s) précédent(s) Voyageur(s) dans le LOGEMENT et nettoyer le linge.
* Passer l'aspirateur sur le tapis/moquette et nettoyer le plancher dans les pièces principales du LOGEMENT.
* Fournir au(x) Voyageur(s), au minimum : 2 rouleaux de papier toilette par toilette du LOGEMENT ; un savon disponible par lavabo du LOGEMENT ; un produit vaisselle disponible par évier de cuisine ; une éponge disponible par évier de cuisine ; sel, poivre, sucre en quantité suffisante pour nombre de voyageurs du LOGEMENT ; produit nettoyant multi surface ; produit nettoyant sols et produit nettoyant vitres; café/thé (1 sachet/personne); essuie-tout; sacs poubelles salle de bain et cuisine; produit WC.
* Effectuer un contrôle final afin de s'assurer que le LOGEMENT est prêt à accueillir le(s) Voyageur(s).

2.2.1.2. L'engagement du PROPRIÉTAIRE en matière de ménage

Le PROPRIÉTAIRE s'engage à mettre à la disposition du PRESTATAIRE dans le LOGEMENT au minimum :
* une brosse de toilette ;
* un seau ;
* un balai ;
* une serpillière ;
* un aspirateur ;
* une raclette ;
* un plumeau ;
* des lavettes microfibre (au moins trois (3) ;
* une éponge métallique pour décaper le four.

Le PROPRIÉTAIRE doit fournir au PRESTATAIRE un endroit de stockage inaccessible et fermé aux voyageurs (cave, placard fermé à clé, une malle) afin d'y disposer le stock des consommables.

2.2.1.3. Services exclus

Le PRESTATAIRE ne réalisera pas en toute hypothèse les services suivants :
* Le nettoyage industriel ; l'extermination d'insectes ;
* le nettoyage de la cour ou du garage ;
* le nettoyage des éléments qui semblent être cassés ou sont susceptibles de se briser lors du nettoyage ;
* le déplacement de meubles lourds ;
* le nettoyage des murs (sauf éclaboussures ou projections de liquides) ;
* le nettoyage des tapis ou un nettoyage en profondeur ; le nettoyage des fenêtres extérieures ;
* le nettoyage de l'intérieur des meubles ;
* le nettoyage des surfaces très sales ne pouvant être nettoyées avec des produits ménagers classiques ;
* le jardinage et le nettoyage de tout abri de jardin ; le retrait des substances végétales ;
* la réfection des surfaces comme les planchers bois, poutres, carrelages rayés, jointoiement de douche, de baignoires, de lavabos, paillasse de cuisine, plinthes de sol, calfeutrement des menuiseries, mise en jeu des portes et huisseries intérieures et extérieures
* et, d'une manière générale, tous travaux de remise en état ou d'entretien courant qui pourraient affecter le LOGEMENT en sa capacité d'hébergement.`,
    contentZonesR: `2.2. Services assurés par le prestataire

2.2.1. Services de Ménage

2.2.1.1. Services de ménage effectués avant le séjour d'un ou plusieurs Voyageur(s) et les consommables fournis

Sous réserve des stipulations figurant au paragraphe 2.2.1.3. ci-dessous, le PRESTATAIRE s'engage à :

* Retirer tous les déchets, les assiettes et couverts dans chaque pièce du LOGEMENT utilisés par le(s) précédent(s) Voyageur(s) (le cas échéant).
* Effectuer un nettoyage ordinaire de toute la surface du LOGEMENT (y compris réfrigérateur, micro-onde, tables, plan de travail de la cuisine et miroirs).
* Nettoyer la salle de bain, les lavabos, les toilettes, etc.
* Faire les lits utilisés par le(s) précédent(s) Voyageur(s) dans le LOGEMENT et nettoyer le linge.
* Passer l'aspirateur sur le tapis/moquette et nettoyer le plancher dans les pièces principales du LOGEMENT.
* Fournir au(x) Voyageur(s), au minimum : 2 rouleaux de papier toilette par toilette du LOGEMENT ; un savon disponible par lavabo du LOGEMENT ; un produit vaisselle disponible par évier de cuisine ; une éponge disponible par évier de cuisine ; sel, poivre, sucre en quantité suffisante pour nombre de voyageurs du LOGEMENT ; produit nettoyant multi surface ; produit nettoyant sols et produit nettoyant vitres; café/thé (1 sachet/personne); essuie-tout; sacs poubelles salle de bain et cuisine; produit WC.
* Effectuer un contrôle final afin de s'assurer que le LOGEMENT est prêt à accueillir le(s) Voyageur(s).

2.2.1.2. L'engagement du PROPRIÉTAIRE en matière de ménage

Le PROPRIÉTAIRE s'engage à mettre à la disposition du PRESTATAIRE dans le LOGEMENT au minimum :
* une brosse de toilette ;
* un seau ;
* un balai ;
* une serpillière ;
* un aspirateur ;
* une raclette ;
* un plumeau ;
* des lavettes microfibre (au moins trois (3) ;
* une éponge métallique pour décaper le four.

Le PROPRIÉTAIRE doit fournir au PRESTATAIRE un endroit de stockage inaccessible et fermé aux voyageurs (cave, placard fermé à clé, une malle) afin d'y disposer le stock des consommables.

2.2.1.3. Services exclus

Le PRESTATAIRE ne réalisera pas en toute hypothèse les services suivants :
* Le nettoyage industriel ; l'extermination d'insectes ;
* le nettoyage de la cour ou du garage ;
* le nettoyage des éléments qui semblent être cassés ou sont susceptibles de se briser lors du nettoyage ;
* le déplacement de meubles lourds ;
* le nettoyage des murs (sauf éclaboussures ou projections de liquides) ;
* le nettoyage des tapis ou un nettoyage en profondeur ; le nettoyage des fenêtres extérieures ;
* le nettoyage de l'intérieur des meubles ;
* le nettoyage des surfaces très sales ne pouvant être nettoyées avec des produits ménagers classiques ;
* le jardinage et le nettoyage de tout abri de jardin ; le retrait des substances végétales ;
* la réfection des surfaces comme les planchers bois, poutres, carrelages rayés, jointoiement de douche, de baignoires, de lavabos, paillasse de cuisine, plinthes de sol, calfeutrement des menuiseries, mise en jeu des portes et huisseries intérieures et extérieures
* et, d'une manière générale, tous travaux de remise en état ou d'entretien courant qui pourraient affecter le LOGEMENT en sa capacité d'hébergement.`,
    contentSansMenage: null,
  },

  // 11. art_2_2_2_linge
  {
    code: "art_2_2_2_linge",
    title: "Services de linge",
    orderIndex: 110,
    scope: "menage",
    contentZonesCj: `2.2.2. Services de Linge

Le PRESTATAIRE s'engage à faire les lits utilisés par le(s) précédent(s) Voyageur(s) dans le LOGEMENT et nettoyer le linge. Le nettoyage du linge est compris et facturé dans la prestation de ménage du PRESTATAIRE, comme stipulé dans le paragraphe 2.4.2. ci-dessous.

Le PROPRIÉTAIRE s'engage à fournir au PRESTATAIRE pour chaque réservation le linge de rechange tel que fixé à l'Annexe 1.

Si le LOGEMENT le permet, le PRESTATAIRE peut être amené à laver le linge sur place afin de garantir la disponibilité et la propreté du linge pour chaque nouveau Voyageur.

Si un article de linge est manquant lors de l'ouverture des lieux pour la prestation de ménage, le PRESTATAIRE assurera une nouvelle entrée en stock, le signalera immédiatement au PROPRIÉTAIRE et facturera le coût de remplacement intégral de cet article au PROPRIÉTAIRE. Il appartiendra au PROPRIÉTAIRE de signaler sur la Plateforme de Réservation Sélectionnées l'incident.`,
    contentZonesR: `2.2.2. Services de Linge

Le PRESTATAIRE s'engage à faire les lits utilisés par le(s) précédent(s) Voyageur(s) dans le LOGEMENT et nettoyer le linge. Le nettoyage du linge est compris et facturé dans la prestation de ménage du PRESTATAIRE, comme stipulé dans le paragraphe 2.4.2. ci-dessous.

Le PROPRIÉTAIRE s'engage à fournir au PRESTATAIRE pour chaque réservation le linge de rechange tel que fixé à l'Annexe 1.

Si le LOGEMENT le permet, le PRESTATAIRE peut être amené à laver le linge sur place afin de garantir la disponibilité et la propreté du linge pour chaque nouveau Voyageur.

Si un article de linge est manquant lors de l'ouverture des lieux pour la prestation de ménage, le PRESTATAIRE assurera une nouvelle entrée en stock, le signalera immédiatement au PROPRIÉTAIRE et facturera le coût de remplacement intégral de cet article au PROPRIÉTAIRE. Il appartiendra au PROPRIÉTAIRE de signaler sur la Plateforme de Réservation Sélectionnées l'incident.`,
    contentSansMenage: null,
  },

  // 12. art_2_2_decoration
  {
    code: "art_2_2_decoration",
    title: "Service de conseils de décoration d'intérieur",
    orderIndex: 120,
    scope: "common",
    contentCommon: `2.2.3. Service de Conseils de Décoration d'Intérieur

Le PRESTATAIRE s'engage à fournir au PROPRIÉTAIRE un service de décoration d'intérieur dans le but d'optimiser l'attrait du LOGEMENT et de maximiser les réservations sur Airbnb. Les décoratrices du PRESTATAIRE offrent des conseils personnalisés à distance, analysant chaque pièce du LOGEMENT à partir des photos fournies et des échanges téléphoniques avec le PROPRIÉTAIRE. Le PRESTATAIRE peut également réaliser des planches déco détaillées et fournir une liste d'objets ou de meubles recommandés pour chaque pièce, afin d'améliorer l'esthétique et l'attractivité du LOGEMENT.

Ce service de décoration d'intérieur constitue une prestation annexe n'engageant nullement le PROPRIÉTAIRE a effectuer des dépenses complémentaires, cependant les conseils du PRESTATAIRE doivent être pris en compte pour obtenir une meilleure attractivité du LOGEMENT mise en location.

Le service de prestation de décoration est réalisé en distanciel, il est effectué sur la base du relevé photographique dressé sur site mais n'impose pas l'automaticité d'une recherche d'amélioration ou d'optimisation des LOGEMENTS du PROPRIÉTAIRE. Si l'équipe de décoration estime suffisante la présentation du LOGEMENT, un simple échange téléphonique avec le PROPRIÉTAIRE sera requis pour des modifications légères à des fins de renouvellement des accastillages du LOGEMENT.`,
  },

  // 13. art_2_2_photos
  {
    code: "art_2_2_photos",
    title: "Service de photos avec valorisation immobilière",
    orderIndex: 130,
    scope: "common",
    contentCommon: `2.2.4. Service de Photos avec valorisation immobilière

Le PRESTATAIRE s'engage également à organiser une séance photo pour le LOGEMENT immobilier du PROPRIÉTAIRE. Ces photos sont ensuite adaptées pour mettre en valeur chaque aspect du LOGEMENT. Les images produites sont de haute qualité et conçues pour capter l'attention des voyageurs potentiels, augmentant ainsi la visibilité et le taux de réservation du LOGEMENT sur les Plateformes de Réservation.
Ces photos sont la propriété exclusive du PRESTATAIRE et de son service de photographie, et les droits qui y sont associés ne peuvent être cédés ni pendant la durée du Contrat de Prestation de Services, ni après sa cessation.`,
  },

  // 14. art_2_2_annonces
  {
    code: "art_2_2_annonces",
    title: "Mise en ligne des annonces sur les plateformes de réservation",
    orderIndex: 140,
    scope: "common",
    contentCommon: `2.2.5. Mise en ligne des annonces sur les Plateformes de Réservation

Le PRESTATAIRE s'engage à mettre en ligne les annonces sur le(s) LOGEMENT(S) du PROPRIÉTAIRE sur des plateformes de réservation.

2.2.5.1. Plateformes de Réservation Sélectionnées

Pour les besoins du Contrat de Prestation de Services, le PRESTATAIRE travaille à partir des seules plateformes de réservation sélectionnées (ci-après « les Plateformes de Réservation Sélectionnées ») comme il suit, pour lesquelles un compte est créé au nom du PROPRIÉTAIRE. Le PROPRIÉTAIRE est donc tenu de prendre connaissance et d'accepter les conditions générales et la politique de confidentialité des Plateformes de Réservation Sélectionnées suivantes : Booking.com et AirBnb.

L'acceptation des conditions des Plateformes de Réservation Sélectionnées dégage le PRESTATAIRE de toute responsabilité en cas de sinistre, dégradation ou vol au sein du LOGEMENT.

2.2.5.2. Suivi des Annonces et la Responsabilité Associée

Le PROPRIÉTAIRE reconnaît que les comptes et annonces créés sur les Plateformes de Réservation Sélectionnées sont exclusivement sa propriété. Le PROPRIÉTAIRE s'engage à s'assurer qu'aucune annonce précédente ou existante ne subsiste sur ces plateformes pour le(s) LOGEMENT(S) concerné(s) avant le début de la prestation du PRESTATAIRE.

À cette fin, le PROPRIÉTAIRE garantit :
* La suppression ou le transfert des droits de propriété des annonces existantes liées au LOGEMENT, s'il en existe, et la fourniture des justificatifs attestant de ces démarches au PRESTATAIRE.
* L'absence de doublons : Toute annonce résiduelle ou doublon empêchant la création de nouvelles annonces par le PRESTATAIRE est sous l'entière responsabilité du PROPRIÉTAIRE.

Le PRESTATAIRE est dégagé de toute responsabilité en cas de détection de doublons ou de suppression des annonces par les plateformes, ces éléments relevant de la responsabilité exclusive du PROPRIÉTAIRE.

2.2.5.3. Dégradation et dommage

Le PRESTATAIRE est tenu d'informer le PROPRIÉTAIRE, photos à l'appui, de tout dommage ou dégradation causé par un voyageur, dans un délai de vingt-quatre (24) heures à compter de la découverte du dommage, afin de permettre l'instruction d'une demande de dédommagement.

En cas d'agissements malveillants ou négligents imputables aux Voyageurs, le PROPRIÉTAIRE — ou, le cas échéant, le PRESTATAIRE dûment mandaté à cet effet par le PROPRIÉTAIRE — tentera d'obtenir réparation des préjudices subis auprès des voyageurs concernés.

Le PRESTATAIRE n'est toutefois tenu à aucune obligation d'intervention en second ressort, notamment sous forme de geste commercial ou de remboursement, en cas d'insuffisance ou d'absence d'indemnisation. Le rôle du PRESTATAIRE est en effet celui d'un prestataire assurant des missions de conciergerie et aucunement d'une compagnie d'assurance. Les locations transitent par les Plateformes de Réservation Sélectionnées qui ont, chacune, leur système de garantie. Le PRESTATAIRE recommande au PROPRIÉTAIRE de souscrire une assurance complémentaire de sorte à garantir l'occurrence de tout sinistre qui ne serait pas couvert par les assurances les Plateformes de Réservation Sélectionnées tant en termes matériels qu'immatériels ; étant précisé que la souscription d'une assurance propriétaire non occupant est obligatoire.`,
  },

  // 15. art_2_2_accueil
  {
    code: "art_2_2_accueil",
    title: "Service d'accueil des voyageurs",
    orderIndex: 150,
    scope: "common",
    contentCommon: `2.2.6. Service d'Accueil des voyageurs

Le PRESTATAIRE pourra organiser, dans la mesure de faisabilité technique, un dispositif de boîte à clé sécurisée pour les entrées autonomes.

La boîte à clé reste la propriété du PRESTATAIRE et sera récupérée en cas de cessation du de Prestation de Services. La boite à clé est localisée dans un accès autonome, accessible aux voyageurs et fixée sur un support autorisé par le PROPRIÉTAIRE. Le PROPRIÉTAIRE indique au PRESTATAIRE avoir reçu toutes les autorisations nécessaires à la mise en place de cette boîte à clé. Le PRESTATAIRE indique que l'emplacement de la boîte à clé a été convenu et localisé à la diligence du PROPRIÉTAIRE.`,
  },

  // 16. art_2_2_communication
  {
    code: "art_2_2_communication",
    title: "Services de communication avec les voyageurs",
    orderIndex: 160,
    scope: "common",
    contentCommon: `2.2.7. Services de Communication avec les Voyageurs

Le PRESTATAIRE s'engage à fournir au PROPRIÉTAIRE un service de communication avec les voyageurs via les plateformes de location, la messagerie électronique et/ou le téléphone. Ce service inclut le traitement des messages entrants et sortants, la réponse aux questions des voyageurs, ainsi que la coordination des arrivées et départs. Ce service comprend l'entière délégation du traitement des messages, de sorte que le PROPRIÉTAIRE s'interdit toute réponse directe aux voyageurs et s'interdit d'interférer dans les mises en contact et location qu'effectue le PRESTATAIRE pour son compte. Toute immixtion rendrait alors la commercialité du LOGEMENT moins efficace.

Le PRESTATAIRE ne s'engage aucunement à des délais de réponse aux voyageurs, mais à une sélection des profils de voyageur assurant une rentabilité et une occupation paisible du LOGEMENT.`,
  },

  // 17. art_2_2_revenue
  {
    code: "art_2_2_revenue",
    title: "Suivi des Prix de Nuitées (Revenue Management)",
    orderIndex: 170,
    scope: "common",
    contentCommon: `Suivi des Prix de Nuitées (Revenue Management)

Le PRESTATAIRE s'engage à optimiser les prix de nuitées pour le PROPRIÉTAIRE, en ajustant les tarifs en fonction de l'offre et de la demande du marché. Cela inclut l'analyse des tendances et la mise en place de stratégies tarifaires pour maximiser les revenus et les taux d'occupation du LOGEMENT.

Le PRESTATAIRE ne s'engage aucunement à un taux de rentabilité ni à un coefficient d'occupation des LOGEMENTS pris en prestation. En cas de diminution de l'offre tarifaire, cette diminution n'a vocation qu'à maximiser l'offre locative, dans un souci d'augmenter la commercialité du LOGEMENT et non de réduire le volume de chiffre d'affaires escompté par le PROPRIÉTAIRE.`,
  },

  // 18. art_2_3
  {
    code: "art_2_3",
    title: "Obligations du propriétaire",
    orderIndex: 180,
    scope: "common",
    contentCommon: `2.3.  Obligations du propriétaire

A titre liminaire, le PROPRIÉTAIRE déclare que sa décision de recourir à la location de courte durée du LOGEMENT résulte de sa seule initiative et qu'il a évalué, en toute indépendance, le caractère approprié de ce type de location à sa situation. Ces déclarations sont déterminantes du consentement du PRESTATAIRE. Le PROPRIÉTAIRE en garantit la véracité à la date de la signature du Contrat de Prestation de Services ainsi que tout au long de son exécution, condition essentielle à la validité du contrat.

Afin de permettre au PRESTATAIRE de fournir les services visés à l'article 2.2, le PROPRIÉTAIRE s'engage à :
* Fournir des informations complètes, exactes et à jour sur le LOGEMENT ainsi que toute autre information qui serait raisonnablement demandée par le PRESTATAIRE ou qui serait jugée pertinente pour la fourniture des services, notamment les éléments relatifs aux comptes du PROPRIÉTAIRE au sein des Plateformes de Réservation Sélectionnées ;
* Attester sur l'honneur que le LOGEMENT mis en location ne constitue pas sa résidence principale à titre habituel ;
* Louer le LOGEMENT pendant au minimum trois cents (300) jours par an ;
* Coopérer pleinement avec le PRESTATAIRE dans la fourniture des services et fournir au PRESTATAIRE un minimum de trois (3) jeux de clefs du LOGEMENT à la signature du Contrat de Prestation de Services;
* Répondre à toute demande d'information qui pourrait être formulée par le PRESTATAIRE, cela de sorte à exécuter le Contrat de Prestation de Services de bonne foi au sens des dispositions du Code Civil ;
* Se conformer aux conditions générales de vente et d'utilisation des Plateformes de Réservation Sélectionnées, notamment aux conditions desdits sites en termes de location (e.g. absence de caméra dans les lieux de couchage, respect de la vie privée des occupants, absence de nuisance des occupants, etc.) ;
* Régler la rémunération du PRESTATAIRE et toutes autres charges qui pourraient survenir ;
* S'interdire, de manière directe ou indirecte, de débaucher ou à solliciter les services de tout collaborateur du PRESTATAIRE ou de toute personne physique ou morale liée par un contrat de prestation de services avec le PRESTATAIRE sans obtenir au préalable l'autorisation expresse écrite du PRESTATAIRE ;
* Le PROPRIÉTAIRE reconnaît et accepte que le PRESTATAIRE n'intervient pas dans le cadre du Contrat de Prestation de Services en qualité d'assureur et qu'il appartient par conséquent au PROPRIÉTAIRE de souscrire un contrat d'assurance approprié pour le LOGEMENT et son contenu de sorte à relever et garantir le PRESTATAIRE de toutes dégradations ou difficulté qui pourrait survenir à l'occasion de l'exécution du Contrat de Prestation de Services. A cet égard, le PROPRIÉTAIRE s'engage à formuler aucune demande indemnitaire de quelque nature au titre des dégradations qui pourraient survenir au titre de l'occupation de son LOGEMENT ou de la ruine de son LOGEMENT du fait de son activité de location courte durée.
* Le PROPRIÉTAIRE autorise par le Contrat de Prestation de Services le PRESTATAIRE à accéder à son compte au sein des Plateformes de Réservation Sélectionnées pour les besoins de l'exécution des prestations objets du Contrat de Prestation de Services, notamment pour mettre en place tous les outils d'automatisation nécessaires (synchronisation des calendriers des différents Plateformes de Réservation Sélectionnées etc.) et les connecter avec son channel manager (outil de suivi d'appartements et de réservations) ou encore pour créer un compte stripe.
* Le PROPRIÉTAIRE donne au PRESTATAIRE son calendrier et l'ensemble des disponibilités du LOGEMENT sur les différents Plateformes de Réservation Sélectionnées. Si le PROPRIÉTAIRE souhaite fermer des dates sur le calendrier de disponibilité du LOGEMENT, il doit envoyer un e-mail à l'adresse indiquée sur le Contrat de Prestation de Services et un SMS au numéro indiqué sur le Contrat avec les dates à bloquer sur le calendrier. Dans le cas d'une non-réponse du PRESTATAIRE, le PROPRIÉTAIRE s'engage à contacter par liaison téléphonique le PRESTATAIRE dans un délai de vingt-quatre (24) heures suivant la demande. Si les dates demandées sont réservées, le PROPRIÉTAIRE aura l'entière responsabilité d'une annulation et des frais découlant de cette annulation. Au regard de la rémunération par palier du PRESTATAIRE, le PROPRIÉTAIRE s'engage à rendre disponible le LOGEMENT de manière régulière et s'interdit de fermer des dates sur le calendrier de plus de soixante (60) jours sur l'année, sauf accord du PRESTATAIRE.
* Le PROPRIÉTAIRE autorise, par le Contrat de Prestation de Services, le PRESTATAIRE à accepter des réservations pour toute date indiquée disponible et à déterminer les prix des réservations, étant précisé que tout accord de nature contractuelle portant sur l'occupation du LOGEMENT sera directement conclu entre le PROPRIÉTAIRE et le Voyageur.
* Le PROPRIÉTAIRE s'engage à indemniser le PRESTATAIRE et de garder le PRESTATAIRE indemne à l'encontre de toutes réclamations, responsabilités, dommages, pertes et dépenses, y compris honoraires d'avocats, qui résulteraient, de manière directe ou indirecte, de la violation par le PROPRIÉTAIRE du Contrat de Prestation de Services ou des termes de tout autre accord conclu avec une Plateforme de Réservation Sélectionnée.
* Le PROPRIÉTAIRE déclare sur l'honneur qu'il est PROPRIÉTAIRE du LOGEMENT dont il dispose librement ou qu'il est dûment mandaté par les PROPRIÉTAIRES pour en disposer librement, notamment dans le cadre du Contrat de Prestation de Services. Il s'engage à fournir tout document utile à la justification de ce mandat à première demande du PRESTATAIRE ;
* Le PROPRIÉTAIRE bénéficie sur le LOGEMENT des autorisations nécessaires pour mettre en location le LOGEMENT, notamment qu'aucune disposition légale, réglementaire, contractuelle (règlement de copropriété) ou autre, ni aucun arrêté municipal ne limite sa capacité à louer le LOGEMENT et à confier au PRESTATAIRE une mission de conciergerie dans les conditions du Contrat de Prestation de Services ou n'est de nature à empêcher le PRESTATAIRE de l'exécuter. Il a la capacité (notamment juridique) et le pouvoir de signer le Contrat de Prestation de Services ;
* La location du LOGEMENT n'affecte pas l'usage auquel est destiné le LOGEMENT et qu'il a procédé aux éventuelles déclarations imposées par les lois et règlements.
* Le LOGEMENT est couvert par une assurance multirisque habitation et propriétaire non occupant couvrant également les dommages pouvant être causés par des tiers dont le Voyageur.  Le PROPRIÉTAIRE déclare ne faire l'objet d'aucune procédure collective et que les LOGEMENTS objets du Contrat de Prestation de Services ne font l'objet d'aucune procédure de saisie immobilière et qu'ils sont libres de droits.
* Le PROPRIÉTAIRE déclare être en règle avec le décret n°2011-36 du 10 janvier 2011 Art. R129-12, imposant l'installation d'un détecteur de fumée normalisé dans les habitations individuelles.
* Le PROPRIÉTAIRE déclare qu'il reste l'unique responsable de la maintenance du LOGEMENT (notamment en termes de réparations nécessaires au confort requis dans le cadre de locations de courte durée), qu'il s'engage à effectuer dans les meilleurs délais à la demande du PRESTATAIRE qu'il s'agisse tant de menus travaux que de remise aux normes essentielles.`,
  },

  // 19. art_2_4_1_intro
  {
    code: "art_2_4_1_intro",
    title: "Rémunération du prestataire - Introduction",
    orderIndex: 190,
    scope: "menage",
    contentZonesCj: `2.4. Rémunération du prestataire

2.4.1. Commission

En contrepartie de l'exécution de la mission de conciergerie confiée au PRESTATAIRE, le PROPRIÉTAIRE lui versera une rémunération correspondant à une commission sur les recettes réalisées (incluant notamment le prix de la location et du ménage, hors commission des Plateformes de Réservation Sélectionnées et hors taxe de séjour) par le PROPRIÉTAIRE dans le cadre des locations courte durée du LOGEMENT, calculées comme suit :`,
    contentZonesR: `2.4. Rémunération du prestataire

2.4.1. Commission

En contrepartie de l'exécution de la mission de conciergerie confiée au PRESTATAIRE, le PROPRIÉTAIRE lui versera une rémunération correspondant à une commission sur les recettes réalisées (incluant notamment le prix de la location et du ménage, hors commission des Plateformes de Réservation Sélectionnées et hors taxe de séjour) par le PROPRIÉTAIRE dans le cadre des locations courte durée du LOGEMENT, calculées comme suit :`,
    contentSansMenage: `2.4. Rémunération du prestataire

2.4.1. Commission

En contrepartie de l'exécution de la mission de conciergerie confiée au PRESTATAIRE, le PROPRIÉTAIRE lui versera une rémunération correspondant à une commission sur les recettes réalisées (incluant notamment le prix de la location, hors frais de ménage, commission des Plateformes de Réservation Sélectionnées et hors taxe de séjour) par le PROPRIÉTAIRE dans le cadre des locations courte durée du LOGEMENT, calculées comme suit :`,
  },

  // 20. art_2_4_1_taux
  {
    code: "art_2_4_1_taux",
    title: "Taux de commission",
    orderIndex: 200,
    scope: "commission",
    contentClassique: `* Recettes inférieures à 600 € (six-cent-euros) T.T.C./mois : 14% T.T.C. sur les recettes du mois ;
* Recettes égales à 600 € (six-cent-euros) T.T.C. /mois mais inférieures 1 300€ (mille-trois-cent-euros) T.T.C. /mois : 18% T.T.C. sur les recettes du mois ;
* Recettes égales ou supérieures à 1 300 € (mille-trois-cent-euros) T.T.C. /mois : 23% T.T.C. sur les recettes du mois.

Le PRESTATAIRE adressera une facture mensuelle au PROPRIÉTAIRE correspondant à sa rémunération au titre des recettes réalisées dans le cadre des locations de courte durée du LOGEMENT au cours du mois précédent. Le PROPRIÉTAIRE s'engage à régler le montant de la facture par virement sur le compte bancaire dont les coordonnées auront été mentionnées sur la facture, dans les cinq (5) jours à compter de sa réception. À défaut de règlement dans ce délai, le PROPRIÉTAIRE autorise expressément le PRESTATAIRE à procéder au paiement par prélèvement bancaire, en application du mandat SEPA préalablement signé à cet effet qui figurera à l'Annexe 3 du Contrat de de Prestation de Services.

Tout retard ou opposition au paiement de sommes dues par le PROPRIÉTAIRE au PRESTATAIRE entraînera de plein droit, dès le premier jour de retard par rapport à la date d'échéance de la facture et sans nécessité de mise en demeure préalable, conformément à l'article 1231-6 du code civil, des dommages et intérêts dont le montant correspondra à 23% (vingt-trois pourcent) T.T.C. de commission sur le prix moyen affiché sur les sites de réservations de 90 (quatre-vingt-dix) nuitées.

Le non-paiement des factures du PRESTATAIRE donnera la possibilité au PRESTATAIRE de résilier immédiatement le Contrat de Prestation de Services dans les conditions fixées à l'article 2.5 ci-après. Si la résiliation du Contrat de Prestation de Services entraîne l'annulation des réservations à venir sur les Plateformes de Réservation Sélectionnées, le paiement des frais d'annulation sera à la seule charge du PROPRIÉTAIRE.

Le PRESTATAIRE adressera alors une facture comportant l'ensemble des frais de résiliation et de pénalité en lettre recommandée avec accusé de réception.`,
    contentStudio: `* 23 % T.T.C. sur les recettes du mois

Le PRESTATAIRE adressera une facture mensuelle au PROPRIÉTAIRE correspondant à sa rémunération au titre des recettes réalisées dans le cadre des locations de courte durée du LOGEMENT au cours du mois précédent. Le PROPRIÉTAIRE s'engage à régler le montant de la facture par virement sur le compte bancaire dont les coordonnées auront été mentionnées sur la facture, dans les cinq (5) jours à compter de sa réception. À défaut de règlement dans ce délai, le PROPRIÉTAIRE autorise expressément le PRESTATAIRE à procéder au paiement par prélèvement bancaire, en application du mandat SEPA préalablement signé à cet effet qui figurera à l'Annexe 3 du Contrat de de Prestation de Services.

Tout retard ou opposition au paiement de sommes dues par le PROPRIÉTAIRE au PRESTATAIRE entraînera de plein droit, dès le premier jour de retard par rapport à la date d'échéance de la facture et sans nécessité de mise en demeure préalable, conformément à l'article 1231-6 du code civil, des dommages et intérêts dont le montant correspondra à 23% (vingt-trois pourcent) T.T.C. de commission sur le prix moyen affiché sur les sites de réservations de 90 (quatre-vingt-dix) nuitées.

Le non-paiement des factures du PRESTATAIRE donnera la possibilité au PRESTATAIRE de résilier immédiatement le Contrat de Prestation de Services dans les conditions fixées à l'article 2.5 ci-après. Si la résiliation du Contrat de Prestation de Services entraîne l'annulation des réservations à venir sur les Plateformes de Réservation Sélectionnées, le paiement des frais d'annulation sera à la seule charge du PROPRIÉTAIRE.

Le PRESTATAIRE adressera alors une facture comportant l'ensemble des frais de résiliation et de pénalité en lettre recommandée avec accusé de réception.`,
    content20pct: `* 20 % T.T.C. sur les recettes du mois

Le PRESTATAIRE adressera une facture mensuelle au PROPRIÉTAIRE correspondant à sa rémunération au titre des recettes réalisées dans le cadre des locations de courte durée du LOGEMENT au cours du mois précédent. Le PROPRIÉTAIRE s'engage à régler le montant de la facture par virement sur le compte bancaire dont les coordonnées auront été mentionnées sur la facture, dans les cinq (5) jours à compter de sa réception. À défaut de règlement dans ce délai, le PROPRIÉTAIRE autorise expressément le PRESTATAIRE à procéder au paiement par prélèvement bancaire, en application du mandat SEPA préalablement signé à cet effet qui figurera à l'Annexe 3 du Contrat de de Prestation de Services.

Tout retard ou opposition au paiement de sommes dues par le PROPRIÉTAIRE au PRESTATAIRE entraînera de plein droit, dès le premier jour de retard par rapport à la date d'échéance de la facture et sans nécessité de mise en demeure préalable, conformément à l'article 1231-6 du code civil, des dommages et intérêts dont le montant correspondra à 23% (vingt-trois pourcent) T.T.C. de commission sur le prix moyen affiché sur les sites de réservations de 90 (quatre-vingt-dix) nuitées.

Le non-paiement des factures du PRESTATAIRE donnera la possibilité au PRESTATAIRE de résilier immédiatement le Contrat de Prestation de Services dans les conditions fixées à l'article 2.5 ci-après. Si la résiliation du Contrat de Prestation de Services entraîne l'annulation des réservations à venir sur les Plateformes de Réservation Sélectionnées, le paiement des frais d'annulation sera à la seule charge du PROPRIÉTAIRE.

Le PRESTATAIRE adressera alors une facture comportant l'ensemble des frais de résiliation et de pénalité en lettre recommandée avec accusé de réception.`,
  },

  // 21. art_2_4_2_frais_menage
  {
    code: "art_2_4_2_frais_menage",
    title: "Frais d'accueil et de nettoyage",
    orderIndex: 210,
    scope: "menage",
    contentZonesCj: `2.4.2. Frais d'accueil et de nettoyage
Outre la commission prévue à l'article 2.4.1, le PRESTATAIRE avancera les paiements relatifs à l'ensemble des frais réellement engagés dans le cadre des prestations suivantes : Ménage, Entretien du linge, et Achat des consommables et produits d'entretien, et ce, pour chaque LOGEMENT loué en courte durée par le PROPRIÉTAIRE pour lequel le PRESTATAIRE intervient dans le cadre du Contrat de Prestation de Services.
Par dérogation à ce qui précède, le PROPRIÉTAIRE s'engage à fournir, exclusivement lors de la mise en place initiale du LOGEMENT (préalablement au premier ménage de mise en service), l'ensemble des consommables suivants en quantité suffisante :
* Hygiène : 2 rouleaux de papier toilette par WC, 1 savon pour les mains par lavabo.
* Cuisine : 1 rouleau d'essuie-tout (sopalin), 1 éponge neuve, produit vaisselle.
* Épicerie de base : Sel, poivre, sucre.
* Accueil : 1 sachet de thé et 1 café (ou capsule) par personne.
* Entretien : 1 sac poubelle pour la cuisine et chaque salle de bain, pastilles lave-vaisselle (le cas échéant), ainsi que les produits d'entretien (sol, vitres, WC, multi-surfaces ou vinaigre ménager).
À l'issue de ce premier ménage, le réassort de ces éléments sera assuré par le PRESTATAIRE et facturé selon les modalités de débours définies au présent Article.
Dans l'hypothèse où, lors de la mise en place du LOGEMENT, l'ensemble de ces consommables ne serait pas fourni par le PROPRIÉTAIRE, un forfait de mise en place sera appliqué par le PRESTATAIRE. Le montant de ce forfait sera communiqué au PROPRIÉTAIRE en amont de son application pour validation.
À titre strictement indicatif, une grille tarifaire est présentée en Annexe 2 pour les prestations de ménage et de linge. Elle ne constitue en aucun cas une base contractuelle de facturation. Les montants définitifs seront ceux effectivement engagés et justifiés dans le cadre du débours.

Ces frais seront facturés au débours, ce qui signifie que le PRESTATAIRE refacture au PROPRIÉTAIRE les sommes effectivement engagées, à l'euro près, sur présentation de justificatifs correspondants (factures de prestataires, tickets de caisse, etc.). Selon l'organisation du prestataire de ménage, ces frais pourront être présentés de manière distincte ou regroupée (ex. : prestation globale ménage + linge + consommables).

Afin d'encadrer ce mécanisme et d'en garantir la transparence, un mandat de débours est annexé au Contrat de Prestation de services. Ce mandat précise notamment :
* La nature des dépenses autorisées (prestations de ménage, linge, consommables, produits d'entretien, etc.) ;
* Les modalités de transmission des justificatifs,
* Les conditions et délais de remboursement.

Ce mandat formalise l'autorisation expresse donnée par le PROPRIÉTAIRE au PRESTATAIRE pour engager, à titre occasionnel ou récurrent, les frais nécessaires au fonctionnement courant du LOGEMENT.

Le tarif appliqué aux prestations de ménage et d'entretien du linge sera précisé au moment de la prise en charge effective du LOGEMENT, en fonction du prestataire sélectionné, de la localisation du LOGEMENT, ainsi que des contraintes particulières et du volume à traiter. Le tarif relatif aux prestations de ménage, en raison du système de débours, est susceptible d'évoluer en fonction des coûts réels engagés, notamment en fonction du prestataire sélectionné, de la localisation, et de la nature des services rendus.

Dans le cadre du Contrat de Prestation de Services, une remise en état approfondie du LOGEMENT (incluant notamment un ménage en profondeur, le nettoyage en hauteur et des vitres) sera réalisée deux à trois fois par an. Ces prestations spécifiques, sortant du cadre des interventions standards, feront l'objet d'un devis préalable du PRESTATAIRE et ne pourront être exécutées qu'après acceptation écrite ou électronique du PROPRIÉTAIRE.

Par ailleurs, à la demande du PROPRIÉTAIRE, le PRESTATAIRE pourra proposer des prestations additionnelles pour l'entretien du linge (ex. : nettoyage approfondi, lavage des couettes, oreillers, etc.). Ces prestations feront également l'objet d'une facturation au débours, sur la base des frais réellement engagés et des justificatifs correspondants.

Les frais relatifs au ménage pourront également être facturés de manière classique par le PRESTATAIRE, selon les tarifs en vigueur au moment de chaque prestation, sans que cette facturation soit limitée par le mécanisme de débours.`,
    contentZonesR: `2.4.2. Frais d'accueil et de nettoyage
Outre la commission prévue à l'article 2.4.1, le PRESTATAIRE avancera les paiements relatifs à l'ensemble des frais réellement engagés dans le cadre des prestations suivantes : Ménage, Entretien du linge, et Achat des consommables et produits d'entretien, et ce, pour chaque LOGEMENT loué en courte durée par le PROPRIÉTAIRE pour lequel le PRESTATAIRE intervient dans le cadre du Contrat de Prestation de Services.
Par dérogation à ce qui précède, le PROPRIÉTAIRE s'engage à fournir, exclusivement lors de la mise en place initiale du LOGEMENT (préalablement au premier ménage de mise en service), l'ensemble des consommables suivants en quantité suffisante :
* Hygiène : 2 rouleaux de papier toilette par WC, 1 savon pour les mains par lavabo.
* Cuisine : 1 rouleau d'essuie-tout (sopalin), 1 éponge neuve, produit vaisselle.
* Épicerie de base : Sel, poivre, sucre.
* Accueil : 1 sachet de thé et 1 café (ou capsule) par personne.
* Entretien : 1 sac poubelle pour la cuisine et chaque salle de bain, pastilles lave-vaisselle (le cas échéant), ainsi que les produits d'entretien (sol, vitres, WC, multi-surfaces ou vinaigre ménager).
À l'issue de ce premier ménage, le réassort de ces éléments sera assuré par le PRESTATAIRE et facturé selon les modalités de débours définies au présent Article.
Dans l'hypothèse où, lors de la mise en place du LOGEMENT, l'ensemble de ces consommables ne serait pas fourni par le PROPRIÉTAIRE, un forfait de mise en place sera appliqué par le PRESTATAIRE. Le montant de ce forfait sera communiqué au PROPRIÉTAIRE en amont de son application pour validation.
À titre strictement indicatif, une grille tarifaire est présentée en Annexe 2 pour les prestations de ménage et de linge. Elle ne constitue en aucun cas une base contractuelle de facturation. Les montants définitifs seront ceux effectivement engagés et justifiés dans le cadre du débours.

Ces frais seront facturés au débours, ce qui signifie que le PRESTATAIRE refacture au PROPRIÉTAIRE les sommes effectivement engagées, à l'euro près, sur présentation de justificatifs correspondants (factures de prestataires, tickets de caisse, etc.). Selon l'organisation du prestataire de ménage, ces frais pourront être présentés de manière distincte ou regroupée (ex. : prestation globale ménage + linge + consommables).

Afin d'encadrer ce mécanisme et d'en garantir la transparence, un mandat de débours est annexé au Contrat de Prestation de services. Ce mandat précise notamment :
* La nature des dépenses autorisées (prestations de ménage, linge, consommables, produits d'entretien, etc.) ;
* Les modalités de transmission des justificatifs,
* Les conditions et délais de remboursement.

Ce mandat formalise l'autorisation expresse donnée par le PROPRIÉTAIRE au PRESTATAIRE pour engager, à titre occasionnel ou récurrent, les frais nécessaires au fonctionnement courant du LOGEMENT.

Le tarif appliqué aux prestations de ménage et d'entretien du linge sera précisé au moment de la prise en charge effective du LOGEMENT, en fonction du prestataire sélectionné, de la localisation du LOGEMENT, ainsi que des contraintes particulières et du volume à traiter. Le tarif relatif aux prestations de ménage, en raison du système de débours, est susceptible d'évoluer en fonction des coûts réels engagés, notamment en fonction du prestataire sélectionné, de la localisation, et de la nature des services rendus.

Dans le cadre du Contrat de Prestation de Services, une remise en état approfondie du LOGEMENT (incluant notamment un ménage en profondeur, le nettoyage en hauteur et des vitres) sera réalisée deux à trois fois par an. Ces prestations spécifiques, sortant du cadre des interventions standards, feront l'objet d'un devis préalable du PRESTATAIRE et ne pourront être exécutées qu'après acceptation écrite ou électronique du PROPRIÉTAIRE.

Par ailleurs, à la demande du PROPRIÉTAIRE, le PRESTATAIRE pourra proposer des prestations additionnelles pour l'entretien du linge (ex. : nettoyage approfondi, lavage des couettes, oreillers, etc.). Ces prestations feront également l'objet d'une facturation au débours, sur la base des frais réellement engagés et des justificatifs correspondants.

Les frais relatifs au ménage pourront également être facturés de manière classique par le PRESTATAIRE, selon les tarifs en vigueur au moment de chaque prestation, sans que cette facturation soit limitée par le mécanisme de débours.`,
    contentSansMenage: null,
  },

  // 22. art_2_4_deplacements
  {
    code: "art_2_4_deplacements",
    title: "Déplacements exceptionnels",
    orderIndex: 220,
    scope: "common",
    contentCommon: `2.4.3. Déplacements exceptionnels

Les déplacements exceptionnels du PRESTATAIRE seront facturés au tarif forfaitaire de 100,00 € (cent-euros) T.T.C. par déplacement (comprend l'aller et le retour, ainsi qu'une heure de temps de présence sur place). Les déplacements exceptionnels sont effectués après demande et validation du PROPRIÉTAIRE, sous réserve de disponibilité du PRESTATAIRE et concernent sans que cela ne soit exhaustif : les déplacements liés à la maintenance du LOGEMENT comme la présence lors du passage d'un agent télécom, des eaux ou d'un artisan. Le temps d'attente avec un artisan ou autre est facturé à 15 € (quinze-euros) T.T.C. par heure supplémentaire. Toute heure entamée est due.`,
  },

  // 23. art_2_4_frais_divers
  {
    code: "art_2_4_frais_divers",
    title: "Frais divers",
    orderIndex: 230,
    scope: "common",
    contentCommon: `2.4.4. Frais divers

Le PROPRIÉTAIRE autorise le PRESTATAIRE à engager, au nom et pour son compte, toutes dépenses d'un montant qui ne saurait excéder 100 € (cent-euros) T.T.C. en vue de prendre toute mesure raisonnable (dite en bon père de famille pour un entretien léger) que le PRESTATAIRE jugerait nécessaire afin d'assurer la satisfaction du Voyageur durant la location de courte durée (toilettes et éviers bouchés, désinsectisation, désinfection, etc). Toute dépense excédant ce montant devra faire l'objet d'un accord du PROPRIÉTAIRE sauf si ce dernier n'est pas joignable et que des réparations d'urgence destinées à assurer la protection de l'intégrité du LOGEMENT (dégât des eaux, etc.) doivent intervenir ou mesures conservatoires urgentes dûment constatées par le PRESTATAIRE. Le PRESTATAIRE ne saurait se substituer au PROPRIÉTAIRE dans les démarches à réaliser pour la sauvegarde ou conservation du LOGEMENT, il sera averti à tous moyens la convenance du PRESTATAIRE de l'état dans lequel le LOGEMENT sera trouvé et connu du PRESTATAIRE lors de son entrée ou reprise des lieux. Les démarches assurantielles demeurent à la charge exclusive du PROPRIÉTAIRE qui en fait son affaire personnelle.

Le PRESTATAIRE refacturera les frais engagés au PROPRIÉTAIRE, sur justificatifs. Le PROPRIÉTAIRE s'engage à payer la facture correspondant auxdits frais à réception.

Le PRESTATAIRE consent que tout travaux engageant la solidité, la sécurité et la destination du LOGEMENT à la location suspendent de plein droit toutes les réservations qui auraient pu être effectuées. Les frais d'annulation ou de relogement des voyageurs restent à la charge exclusive du PROPRIÉTAIRE.`,
  },

  // 24. art_2_5
  {
    code: "art_2_5",
    title: "Exclusivité - Durée - Résiliation",
    orderIndex: 240,
    scope: "common",
    contentCommon: `2.5  Exclusivité - Durée - Résiliation

2.5.1. Le Contrat de Prestation de Services est conclu à titre exclusif par le PROPRIÉTAIRE. Dès lors, pendant toute la durée du Contrat de Prestation de Services, le PROPRIÉTAIRE s'interdit de conclure tout autre contrat de prestation de service identique ou de procéder à la mise en location de son LOGEMENT directement ou indirectement.

2.5.2. Le Contrat de Prestation de Services entre en vigueur à compter de sa signature par les Parties.

Il débute par une phase préparatoire destinée à la mise en conformité et à la préparation du LOGEMENT en vue de sa commercialisation. À l'issue de cette phase préparatoire, matérialisée par la date d'ouverture des calendriers de location sur les Plateformes de Réservation Sélectionnées, le Contrat de Prestation de Services se poursuivra automatiquement pour une durée ferme de douze (12) mois.

Le Contrat de Prestation de Services se renouvellera tacitement chaque année à la date d'anniversaire de l'issue de la phase préparatoire, pour une nouvelle durée de 12 (douze) mois, sauf résiliation notifiée par l'une ou l'autre des Parties par lettre recommandée avec accusé de réception au moins 90 (quatre-vingt-dix) jours avant la date de son renouvellement.

2.5.3. Le PROPRIÉTAIRE conserve la faculté de mettre fin au Contrat de Prestation de Services de manière anticipée, pour quelque cause que ce soit, ou de rendre le LOGEMENT indisponible à la location de courte durée pour une période excédant soixante (60) jours au cours d'une même année civile, ou quinze (15) jours au cours des mois de juillet et août, sous réserve d'en informer préalablement le PRESTATAIRE par écrit, par lettre recommandée avec accusé de réception ou par tout autre moyen conférant date certaine.

Dans cette hypothèse, le PROPRIÉTAIRE s'engage à verser au PRESTATAIRE, à titre de dédit contractuel, une somme forfaitaire calculée pro rata temporis sur la commission que le PRESTATAIRE aurait perçue si le Contrat de Prestation de Services avait été exécuté jusqu'à son terme. Cette somme correspond à vingt-trois pour cent (23 % T.T.C.) de la commission estimée sur le prix moyen de quatre-vingt-dix (90) nuitées affiché sur les Plateformes de Réservation Sélectionnées, multipliée par le nombre de mois restant à courir jusqu'au terme du Contrat de Prestation de Services.

Le paiement de ce dédit aura pour effet de libérer définitivement le PROPRIÉTAIRE de toute obligation envers le PRESTATAIRE au titre de la résiliation anticipée ou de l'indisponibilité du LOGEMENT, sans qu'aucune autre indemnité ou pénalité ne puisse être réclamée à ce titre à l'exception du paiement du prix des prestations réalisées par le PRESTATAIRE ou l'un de ses sous-traitant fixées ci-dessous.

2.5.4. Dans le cadre de sa mission le PRESTATAIRE réalise préalablement à la mise en location une préparation du LOGEMENT avec différentes fournitures et services au profit du PROPRIÉTAIRE.

Ces prestations sont indiquées ci-dessous avec les montants correspondants :

* ⁠Inventaire complet du LOGEMENT et conseils sur les éléments à ajouter pour la mise en location : 250 (deux-cent-cinquante) € T.T.C.
* Prise de vues avec améliorations professionnelles du LOGEMENT : 450 € (quatre-cent-cinquante euros) T.T.C.
* ⁠⁠Reprise et optimisation des annonces sur les Plateformes de Réservation Sélectionnées : 250 € (deux-cent-cinquante euros) T.T.C./Annonce
* ⁠⁠Mise en place d'un Pack de messages automatiques aux voyageurs : 180 € (cent-quatre-vingts euros) T.T.C.
* Pack de Tutos Vidéos d'accès et d'utilisation des équipements du LOGEMENT : 250 € (deux-cent-cinquante euros) T.T.C.
* Mise en place, programmation et pose d'une boîte à clé sécurisée : 450 € (quatre-cent-cinquante euros) T.T.C.
* Analyse du LOGEMENT et conseils par une décoratrice d'intérieur sur photos : 950 € (neuf-cent-cinquante euros) T.T.C.

L'ensemble de ces prestations ne sont pas facturées au PROPRIÉTAIRE dans le cadre du Contrat de Prestation de Services dans la mesure où le PROPRIÉTAIRE s'engage à la souscription du Contrat de Prestation de Services pour une durée minimale de douze mois à compter de la date d'ouverture des calendriers de location sur les Plateformes de Réservation Sélectionnée. En cas de résiliation anticipée du Contrat de Prestation de Services pour quelque cause que ce soit avant tout renouvellement du Contrat de Prestation de Services, le PROPRIÉTAIRE sera redevable du paiement de l'ensemble des services précités aux tarifs ci-dessus exposés par LOGEMENT préparé, ces tarifs étant forfaitaires, unitaires et couvrant le prix de la prestation réalisée. Ces tarifs ne sauraient être assimilés à une clause pénale mais la contre-valeur du travail réalisé par le PRESTATAIRE pour mettre en commercialisation le LOGEMENT du PROPRIÉTAIRE sur les différentes plateformes et optimiser sa commercialité.

2.5.5. Il est expressément convenu entre les Parties que le PROPRIÉTAIRE dispose d'une faculté de résiliation anticipée du Contrat de Prestation de Services en cas d'absence totale de réponse du PRESTATAIRE aux relances répétées écrites (WhatsApp et e-mail) du PROPRIÉTAIRE pendant une période continue de quinze (15) jours calendaires. Le PROPRIÉTAIRE pourra alors notifier au PRESTATAIRE une mise en demeure de reprendre contact, par lettre recommandée avec accusé de réception ou tout moyen électronique équivalent à une lettre recommandée avec accusé de réception. Si, dans un délai de sept (7) jours suivant la réception de ladite mise en demeure, le PRESTATAIRE ne répond pas ou ne justifie pas d'un cas de force majeure dûment prouvé, le PROPRIÉTAIRE pourra demander la résiliation amiable du Contrat de Prestation de Services, sans frais de résiliation.

Toutefois, cette faculté de résiliation anticipée du Contrat de Prestation de Services ne saurait être utilisée pour des motifs abusifs, subjectifs ou sans lien direct avec une inexécution réelle et grave des obligations du PRESTATAIRE. Le silence du PRESTATAIRE pendant les périodes de congés annoncées par le PRESTATAIRE, ou en cas de communication temporairement interrompue de moins de quinze (15) jours calendaires consécutifs mais suivie d'une reprise normale de l'activité, ne pourra pas être assimilé à une absence prolongée ouvrant droit à résiliation du Contrat de Prestation de Services par le PROPRIÉTAIRE.

2.5.6. Dans le cas où la création des annonces sur le(s) LOGEMENT(S) serait impossible en raison de la persistance de doublons ou de conflits liés à des annonces antérieures ou de faute du PROPRIÉTAIRE rendant impossible la poursuite de l'exécution du contrat, le Contrat de Prestation de Services ne pourra pas être exécuté. Cette situation sera alors considérée comme une résiliation anticipée à l'initiative du PROPRIÉTAIRE, conformément aux stipulations du présent article et donnera lieu au paiement par le PROPRIÉTAIRE de l'indemnité de dédit prévue à l'article 2.5.3 du Contrat de Prestation de Services.`,
  },

  // 25. art_2_6
  {
    code: "art_2_6",
    title: "Responsabilité",
    orderIndex: 250,
    scope: "common",
    contentCommon: `2.6. Responsabilité

Dans le cadre de l'exécution du Contrat de Prestation de Services, le PROPRIÉTAIRE reconnaît que le PRESTATAIRE ne saurait être tenu responsable des pertes ou dommages subis par le PROPRIÉTAIRE ou par des tiers lorsque ceux-ci résultent exclusivement :
* de détériorations, dégradations ou dommages causés par les Voyageurs au LOGEMENT et/ou aux parties communes de l'immeuble ;
* de pertes, vols ou dommages affectant le contenu du LOGEMENT imputables aux Voyageurs ;
* du comportement des Voyageurs ;
* de la défaillance ou de l'indisponibilité de prestations fournies par des tiers non mandatés par le PRESTATAIRE.

Toutefois, le PRESTATAIRE demeure responsable des dommages résultant d'un manquement à ses obligations contractuelles, d'une faute ou d'une négligence graves et répétées dans l'exécution de sa mission, notamment en matière de sélection, de coordination et de contrôle des prestataires qu'il mandate, ainsi que de surveillance générale du LOGEMENT.

Le PRESTATAIRE reste également responsable des dommages liés à l'état ou à la sécurité du LOGEMENT lorsqu'il avait connaissance, ou aurait dû raisonnablement avoir connaissance, d'un risque ou d'un dysfonctionnement et n'a pas pris les mesures appropriées pour y remédier ou en informer le PROPRIÉTAIRE.

Le PRESTATAIRE n'encourra aucune responsabilité à l'égard du PROPRIÉTAIRE au titre de toute violation, établie ou alléguée du Contrat de Prestation de Services en raison de tout retard dans l'exécution de la prestation ou de tout manquement, qui trouverait sa cause, de manière directe ou indirecte, dans un évènement extérieur à la volonté du PRESTATAIRE tels qu'un évènement de force majeure, une indisponibilité du LOGEMENT qui ne serait pas du fait du PRESTATAIRE, des intempéries, une panne de courant, un cambriolage, une catastrophe naturelle, une grève, une action des autorités municipales ou gouvernementales, un acte de terrorisme ou de guerre, des troubles civils ou toute autre évènement similaire.

En aucun cas, sauf lorsque la loi en vigueur ou une convention écrite l'exige, le PRESTATAIRE ne sera tenu responsable des dommages indirects, consécutifs ou non-consécutifs tels que notamment le préjudice commercial, le trouble commercial, la perte de bénéfice, la perte de commandes, la perte d'économies escomptées, la perte d'exploitation, la perte d'image, résultant de l'exécution du Contrat de Prestation de Services. Il est notamment rappelé que la conclusion du Contrat de Prestation de Services ne garantit en aucune manière la perception par le PROPRIÉTAIRE d'un montant de recettes déterminé, de sorte que la responsabilité du PRESTATAIRE ne pourra être recherchée sur le fondement d'une perte de chance ou d'une perte de gain.

Nonobstant toute stipulation contraire figurant au Contrat de Prestation de Services et sous réserve des dispositions légales en vigueur, la responsabilité du PRESTATAIRE pour toutes pertes et/ou dommages liés ou résultant de l'exécution du Contrat de Prestation de Services (y compris notamment des dommages matériels) sera limitée au plus élevé des montants suivants : soit au montant correspondant au coût de remplacement du service en cause, soit au montant correspondant à la Commission versée par le PROPRIÉTAIRE au PRESTATAIRE au cours des douze (12) derniers jours précédant la survenance du dommage ou de la perte.

En confiant les clés du LOGEMENT au PRESTATAIRE, le PROPRIÉTAIRE autorise expressément l'accès à son LOGEMENT à tout employé du PRESTATAIRE et agent mandaté par le PRESTATAIRE et uniquement ces derniers. Le PROPRIÉTAIRE est responsable pour le paiement des impôts locaux dont la taxe d'habitation et la taxe foncière de même que l'ensemble des charges de l'appartement dont les charges de copropriété et les contrats d'eau d'électricité, de gaz, d'internet, les assurance habitation et PROPRIÉTAIRE non occupant ainsi que toute nouvelle redevance ou taxe dont l'occurrence pourrait se faire jour à l'occasion de l'exécution du Contrat de Prestation de Services.`,
  },

  // 26. art_2_7
  {
    code: "art_2_7",
    title: "Cession du contrat",
    orderIndex: 260,
    scope: "common",
    contentCommon: `2.7. Cession du contrat

Par dérogation expresse aux dispositions de l'article 2003 du Code civil, le décès du PROPRIÉTAIRE n'emportera pas la résiliation de plein droit du Contrat de Prestation de Services qui se poursuivra avec les ayants-droits du PROPRIÉTAIRE, fussent-ils mineurs ou autrement incapables.

Le PROPRIÉTAIRE autorise le PRESTATAIRE à se substituer et céder le Contrat de Prestation de Services à toute personne physique ou morale pour l'exécution du Contrat de Prestation de Services. En cas de substitution ou de cession du Contrat de Prestation de Services, le Contrat de Prestation de Services se poursuivra au profit du successeur du PRESTATAIRE ce qui est accepté par le PROPRIÉTAIRE. Le PROPRIÉTAIRE devra être informé de la substitution ou de la cession du Contrat de Prestation de Services, par lettre recommandée avec demande d'avis de réception, dans les sept (7) jours de la survenance de l'événement.`,
  },

  // 27. art_2_8
  {
    code: "art_2_8",
    title: "Fin du contrat",
    orderIndex: 270,
    scope: "common",
    contentCommon: `2.8  Fin du contrat

Au terme du Contrat de Prestation de Services, le PRESTATAIRE adressera au PROPRIÉTAIRE un solde des comptes.

Dans l'hypothèse où, au terme du Contrat de Prestation de Services, des réservations avaient déjà été acceptées par le PRESTATAIRE, le Contrat de Prestation de Services perdurera dans tous ses effets, notamment concernant le paiement de la commission par le PROPRIÉTAIRE au PRESTATAIRE, pour les réservations réalisées.

Le PRESTATAIRE ne saurait être tenu responsable des éventuels dommages résultant de l'installation ou de la désinstallation des équipements qu'il a fournis dans l'exercice de ses missions. Tout équipement fourni par le PRESTATAIRE demeure sa propriété exclusive, de même que les photographies des LOGEMENTS prises par lui.
Le PROPRIÉTAIRE s'engage à retirer toute photographie propriété du PRESTATAIRE à l'issue du Contrat de Prestation de Services. Toute utilisation abusive desdites photographies fera l'objet de poursuites judiciaires et d'une demande d'indemnisation. De plus, si les photographies restent publiées sur les annonces au lendemain de l'échéance du Contrat de Prestation de Services, une indemnité forfaitaire de 450 (quatre-cent-cinquante) € T.T.C. sera immédiatement due.

En outre, à la cessation du Contrat de Prestation de Services pour quelque motif que ce soit, le PROPRIÉTAIRE sera tenu de procéder à l'enlèvement de la boîte à clé et de la restituer au PRESTATAIRE dont l'adresse figure en tête du Contrat de Prestation de Services, dans un colis Chronopost avec accusé de réception. A défaut, une pénalité calendaire de dix (10) € par jour de retard à compter du 8ème jour suivant la date de cessation des relations contractuelle sera appliquée de plein droit et ce même sans l'envoi d'une mise en demeure préalable. Par ailleurs, en cas de non-restitution de la boîte à clés ou de tout autre dispositif permettant un accès autonome, une indemnité forfaitaire de 450 (quatre-cent-cinquante) € T.T.C. sera due par le PROPRIÉTAIRE ; outre la facturation des frais de restitution tel que mentionné dans les articles ci-dessus.`,
  },

  // 28. art_2_9
  {
    code: "art_2_9",
    title: "Confidentialité et non-dénigrement",
    orderIndex: 280,
    scope: "common",
    contentCommon: `2.9. Confidentialité et non-dénigrement

Les Parties s'engagent à garder strictement confidentiels tous les renseignements, documents, données, et plus généralement toute information obtenus dans le cadre de l'exécution du Contrat de Prestation de Services. Cette obligation de confidentialité s'applique sans limitation de durée, même après la fin du Contrat de Prestation de Services, et couvre également tous les échanges et communications, qu'ils soient oraux ou écrits, entre les Parties.

Le PROPRIÉTAIRE s'interdit de divulguer, partager ou transmettre ces informations à tout tiers, sauf autorisation écrite préalable du PRESTATAIRE.

Les Parties s'engagent, pendant toute la durée du Contrat de Prestation de Services et pendant une période de deux (2) années à compter de sa cessation, pour quelque cause que ce soit, à s'abstenir de tout propos, écrit ou comportement, public notamment sur les réseaux sociaux ou privé, direct ou indirect, susceptible de porter atteinte à l'image, à la réputation, à la notoriété ou aux intérêts commerciaux de l'autre Partie, de ses dirigeants, ou prestations.

En cas de manquement à la présente obligation, la Partie défaillante sera tenue de verser à l'autre Partie, à titre de clause pénale, une indemnité forfaitaire de mille cinq cents (1.500) euros par manquement constaté, sans préjudice du droit pour la Partie lésée de solliciter la cessation immédiate des agissements litigieux et de la réparation de tout préjudice complémentaire si le dommage subi excède le montant de la pénalité. Les Parties reconnaissent que le montant de la pénalité constitue une évaluation raisonnable et proportionnée du préjudice susceptible d'être subi du fait d'un acte de dénigrement.`,
  },

  // 29. art_2_10
  {
    code: "art_2_10",
    title: "Sous-traitance - Respect de la législation sociale",
    orderIndex: 290,
    scope: "common",
    contentCommon: `2.10. Sous-traitance - Respect de la législation sociale

Le PRESTATAIRE est autorisé par le PROPRIÉTAIRE à faire appel à des sous-traitants dans le cadre de l'exécution du Contrat de Prestation de Services sous sa seule responsabilité.
Pendant toute la durée d'exécution du Contrat de Prestation de Services, le PRESTATAIRE garantit être à jour de ses obligations relatives aux déclarations et attestations de chacun de ses sous-traitants, notamment celles visées par les dispositions du Code du travail.`,
  },

  // 30. art_3_1
  {
    code: "art_3_1",
    title: "Durée et levée de la Promesse par le prestataire",
    orderIndex: 300,
    scope: "common",
    contentCommon: `ARTICLE 3 - DUREE DE LA PROMESSE – SIGNATURE DU CONTRAT DÉFINITIF DE PRESTATION DE SERVICES

3.1 Durée et levée de la Promesse par le PRESTATAIRE

Le PROPRIÉTAIRE s'oblige à signer, au plus tard dans un délai de 180 (cent-quatre-vingts) jours à compter de la signature de la présente Promesse, le Contrat de Prestation de Services qui aura pour objet de conférer au PRESTATAIRE, ou à tout tiers qu'elle viendrait à se substituer conformément à l'article 1.3., une mission de conciergerie dans le cadre de la location en courte durée du Logement dans les termes et conditions du Contrat de Prestation de Services.

À tout moment, pendant ce délai de 180 (cent-quatre-vingts) jours à compter de la signature de la présente Promesse, le PRESTATAIRE pourra notifier, par tous moyens et notamment par l'envoi d'un email à l'adresse direction@conciergerie-letahost.com, la levée de la Promesse au PROPRIÉTAIRE, l'identité et les coordonnées du tiers qu'elle se sera substitué le cas échéant, en l'invitant à signer le Contrat de Prestation de Services dans un délai de 10 (dix) jours.

À défaut, pour le PRESTATAIRE, d'avoir manifesté sa volonté de conclure le Contrat de Prestations de Services, ou pour le tiers auquel il se serait valablement substitué conformément aux dispositions de l'article 1.3, d'avoir signé ledit contrat, dans un délai de 180 (cent quatre-vingts) jours à compter de la signature de la présente Promesse, celle-ci sera réputée caduque de plein droit.

Le PROPRIÉTAIRE recouvrera alors toute liberté de contracter avec tout autre prestataire de conciergerie, sans être tenu d'en informer ni d'en rendre compte au PRESTATAIRE.`,
  },

  // 31. art_3_2
  {
    code: "art_3_2",
    title: "Carence du propriétaire",
    orderIndex: 310,
    scope: "common",
    contentCommon: `3.2. Carence du Propriétaire
Dans l'hypothèse où, après que le PRESTATAIRE — ou le tiers auquel il se serait valablement substitué conformément à l'article 1.3 — a notifié au PROPRIÉTAIRE, dans les conditions prévues à l'article 3.1, sa volonté de conclure le Contrat de Prestations de Services, le PROPRIÉTAIRE, qui n'aurait pas exercé son droit à rétractation dans les conditions fixées à l'article 1.4 de la présente Promesse, refuserait ou serait dans l'impossibilité de signer ledit contrat, le PRESTATAIRE pourra le mettre en demeure de procéder à cette signature. Cette mise en demeure fixera un délai d'exécution qui ne pourra être inférieur à dix (10) jours à compter de sa notification.

À défaut de réponse du PROPRIÉTAIRE dans ce délai, le PRESTATAIRE pourra, sans mise en demeure préalable supplémentaire et sans intervention judiciaire, constater de plein droit la résolution de la Promesse en raison de la carence du PROPRIÉTAIRE. Cette résolution sera notifiée au PROPRIÉTAIRE par lettre recommandée avec demande d'avis de réception exprimant de manière non équivoque la volonté du PRESTATAIRE de constater ladite résolution.

En cas de résolution de la Promesse imputable à la carence du PROPRIÉTAIRE, celui-ci sera redevable envers le PRESTATAIRE d'une indemnité correspondant aux prestations réalisées dans le cadre de la préparation de la mise en location du LOGEMENT, incluant diverses fournitures et services fournis à son bénéfice, selon la tarification suivante :
* ⁠Inventaire complet du LOGEMENT et conseils sur les éléments à ajouter pour la mise en location : 250 (deux-cent-cinquante) € T.T.C.
* Prise de vues avec améliorations professionnelles du LOGEMENT : 450 € (quatre-cent-cinquante euros) T.T.C.
* ⁠⁠Reprise et optimisation des annonces sur les Plateformes de Réservation Sélectionnées : 250 € (deux-cent-cinquante euros) T.T.C./Annonce
* ⁠⁠Mise en place d'un Pack de messages automatiques aux voyageurs : 180 €         (cent-quatre-vingts euros) T.T.C.
* Pack de Tutos Vidéos d'accès et d'utilisation des équipements du LOGEMENT : 250 € (deux-cent-cinquante euros) T.T.C.
* Mise en place, programmation et pose d'une boîte à clé sécurisée : 450 € (quatre-cent-cinquante euros) T.T.C.
* Analyse du LOGEMENT et conseils par une décoratrice d'intérieur sur photos : 950 € (neuf-cent-cinquante euros) T.T.C.
Le PRESTATAIRE suspendra immédiatement les démarches de référencement et placement du LOGEMENT sur les plateformes en ligne. Il adressera au PROPRIÉTAIRE une mise en demeure de paiement valant également résiliation unilatérale de la Promesse, accompagnée de la facture correspondant aux prestations exécutées.
Sous réserve du règlement intégral des sommes dues, le PROPRIÉTAIRE recouvrera la faculté de conclure un contrat avec tout autre prestataire de conciergerie, sans obligation d'en informer le PRESTATAIRE, étant précisé qu'il ne pourra bénéficier des supports numériques créés par ce dernier.`,
  },

  // 32. art_4
  {
    code: "art_4",
    title: "Confidentialité",
    orderIndex: 320,
    scope: "common",
    contentCommon: `ARTICLE 4 – CONFIDENTIALITE

Il est convenu entre les Parties que constitue une information confidentielle tout document ou donnée concernant l'une des Parties, de quelque nature que ce soit, écrit ou non, quel qu'en soient la forme, le support ou le mode d'écriture, et notamment, sans que cette liste soit exhaustive, tout document d'ordre économique, technologique, commercial, social, financier, juridique, scientifique, organisationnel, tout document relatif au « savoir-faire » ou aux méthodes d'une des Parties, dont l'autre Partie aurait pu avoir connaissance directement ou indirectement au titre du Contrat (ci-après les « Informations Confidentielles »). Les Parties considéreront comme strictement confidentielle toute Information Confidentielle et s'interdiront de la divulguer.

Pour l'application de la présente clause, les Parties répondent de leurs collaborateurs, salariés ou non, de leurs prestataires ou encore de leurs filiales ou sociétés-sœurs comme d'elles-mêmes.
Les Parties toutefois ne sauraient être tenues responsables d'aucune divulgation si les éléments divulgués étaient dans le domaine public, si elles en avaient connaissance ou les obtenaient de tiers par des moyens légitimes, ou si elles en avaient obtenu l'autorisation écrite et préalable par l'autre Partie.`,
  },

  // 33. art_5
  {
    code: "art_5",
    title: "Indépendance des stipulations",
    orderIndex: 330,
    scope: "common",
    contentCommon: `ARTICLE 5 – INDÉPENDANCE DES STIPULATIONS

Les Parties conviennent que si une quelconque des stipulations du présent contrat ou une partie d'entre elles se révélait nulle au regard d'une règle de droit ou d'une loi en vigueur, elle serait réputée non écrite, mais n'entraînerait pas la nullité du contrat.`,
  },

  // 34. art_6
  {
    code: "art_6",
    title: "Intégralité de l'accord",
    orderIndex: 340,
    scope: "common",
    contentCommon: `ARTICLE 6 – INTEGRALITE DE L'ACCORD

Le présent contrat constitue l'intégralité de l'accord et annule tous autres accords écrits ou verbaux antérieurs. Il prévaut également sur toute convention et sur tous usages et coutumes applicables dans la profession. Toute convention ultérieure au présent contrat doit faire l'objet d'un avenant signé par les Parties.`,
  },

  // 35. art_7
  {
    code: "art_7",
    title: "Litige et droit applicable",
    orderIndex: 350,
    scope: "common",
    contentCommon: `ARTICLE 7 – LITIGE ET DROIT APPLICABLE

De convention expresse entre les Parties, le présent contrat est régi et soumis au droit français, nonobstant l'existence d'un élément d'extranéité quelconque.

Il est rédigé en langue française. Dans le cas où il serait traduit en une ou plusieurs langues, seul le texte français ferait foi.

Les Parties s'engagent, en cas de difficultés dans l'exécution du contrat et préalablement à toute procédure judiciaire ou médiation, à rechercher, entre elles et sans l'intervention d'une tierce personne, un arrangement amiable à leur différend. A défaut d'arrangement amiable, tout litige relatif à l'interprétation, à l'exécution ou à la résolution du Contrat, sera de la compétence exclusive du tribunal de commerce de Paris, même en cas d'appel en garantie ou de pluralité de défendeurs.`,
  },

  // 36. art_8
  {
    code: "art_8",
    title: "Signature électronique",
    orderIndex: 360,
    scope: "common",
    contentCommon: `ARTICLE 8 - SIGNATURE ÉLECTRONIQUE

Les Parties aux présentes reconnaissent que :
-           le présent contrat est conclu sous la forme d'un écrit électronique, conformément aux dispositions de l'article 1366 du Code civil, et signé électroniquement au moyen d'un procédé\u0301 fiable d'identification mis en place par la plateforme DOCUSIGN garantissant le lien entre chaque signature avec le contrat auquel elles s'attachent, conformément aux dispositions de l'article 1367 du Code civil ;
-           le présent contrat a la même force probante qu'un écrit sur support papier conformément à l'article 1366 du Code civil et qu'il pourra leur être valablement opposé ;
-           L'exigence d'une pluralité\u0301 d'originaux est réputée satisfaite lorsque l'acte signé électroniquement est établi et conservé conformément aux articles 1366 et 1367 du Code civil, et que (ii) ce procédé\u0301 permet à chaque partie de disposer d'un exemplaire sur support durable ou d'y avoir accès, conformément aux dispositions de l'article 1375 du Code civil.`,
  },

  // 37. bloc_signature
  {
    code: "bloc_signature",
    title: "Bloc de signature",
    orderIndex: 370,
    scope: "common",
    contentCommon: `Réputé fait à                                                                         , en deux originaux le :
Lu et approuvé par les deux parties,




Bon pour accord et signature du PROPRIÉTAIRE         Bon pour accord et cachet LETAHOST
Bon pour accord`,
  },

  // 38. annexe_1
  {
    code: "annexe_1",
    title: "Équipements",
    orderIndex: 380,
    scope: "common",
    contentCommon: `ANNEXE 1 : ÉQUIPEMENTS

Equipements obligatoires :

* Linge : 3 jeux de draps par lit (housse de couette, drap-housse, taies d'oreiller), 1 couette par lit, 3 grandes serviettes par voyageur, 3 petites serviettes par voyageur, 2 alèses minimum par lit, 3 tapis de bain par salle de bain, 3 torchons de cuisine minimum, 1 oreiller par voyageur.
* Lit + Matelas
* Penderie + cintres
* Table et Chaises (en quantité suffisante)
* Canapé
* Réfrigérateur et congélateur
* Plaques de cuisson (vitrocéramique, induction ou électrique)
* ⁠Four ; Four à micro-ondes
* Machine à café (i.e. Nespresso, Tassimo, Senseo, Dolce Gusto ou cafetière filtre) ;
* Grille-pain
* Bouilloire
* Poêles (différentes tailles) et Casseroles (différentes tailles)
* Spatule, cuillère en bois, louche ; Ouvre-boîte ; Tire-bouchon ; Éplucheur ; Ciseaux de cuisine
* Planche à découper ; Bol à mélanger ; Plat de cuisson four ; Passoire ; Couteau à pain
* Vaisselle (en quantité correspondant au nombre de couchages) : Assiettes plates, creuses et à dessert ; Verres à vin ; Verres à eau; Tasses à café ; mugs ; bols
* Couverts (en quantité correspondant au nombre de couchages) : fourchettes ; couteaux ; cuillères ; petites cuillères
* Saladier
* Douche ou Baignoire
* Poubelles (salle de bain et WC)
* Aspirateur
* Serpillière type balai plat
* Seau et Balai
* Détecteur de fumée
* Espace de stockage fermé (pour linge et consommables)
* Sèche-cheveux
* Wi-fi

Équipements Conseillés
* Canapé-lit
* Bureau avec Chaise
* Table de chevet avec lampe
* Volets ou rideaux occultants
* Penderie supplémentaire
* Lit bébé + chaise haute
* Ventilateur ou climatiseur
* Ustensiles à salade
* Table basse
* Table à repasser + fer à repasser
* Télévision et Plateformes (Netflix, Disney+, Prime, etc.)
* Coupes de champagne
* Lave-vaisselle
* Lave-linge et Sèche-linge
* Trousse de secours
* Etendoir à linge
* Poubelle avec tri jaune ; Poubelle ordures ménagères et Poubelle à verre
* Table d'extérieur
* Jeux de société / Jeux pour enfants
* Adaptateur prise étrangère et réveil
* Guide complet de la ville ou de la région
* Aménagements extérieurs (mobilier de jardin, jacuzzi, barbecue...)`,
  },

  // 39. annexe_2
  {
    code: "annexe_2",
    title: "Grille estimative ménage",
    orderIndex: 390,
    scope: "menage",
    contentZonesCj: `ANNEXE 2 - GRILLE ESTIMATIVE MÉNAGE




TYPOLOGIE APPARTEMENT
\tSUPERFICIE
\tEXEMPLE DE FORFAIT
[Ménage + Linge + Consommables]
\tStudio
\t1 seule pièce
\t> 30m2
\t
\t1 Lit :
\t42€
\t2 Lits :
\t47€
\tT1/T1bis
\t1 seule pièce
\t30-34m2
\t
\t1 lit :
\t45€
\t2 lits :
\t50€
\tT2
\t1 chambre
\t35-54m2
\t
\t1 lit :
\t55€
\t2 lits :
\t60€
\tT3
\t2 chambres
\t55-75m2
\t
\t2 lits :
\t74€
\t3 lits :
\t79€
\t4 lits :
\t84€
\tT4
\t3 chambres
\t80-100m2
\t
\t3 lits :
\t92€
\t4 lits :


\t97€
\t5 lits :
\t102€
\t6 lits :
\t107€
\tTYPOLOGIE APPARTEMENT
\tSUPERFICIE
\tEXEMPLE DE FORFAIT
[Ménage + Linge + Consommables]
\tT5
\t4 chambres
\t100-150m2
\t
\t4 lits :
\t110€
\t5 lits :
\t115€
\t6 lits :
\t120€
\t7 lits :
\t125€
\t8 lits :
\t130€
\tT6
\t5 chambres
\t140-190m2
\t
\t5 lits :
\t143€
\t6 lits :
\t148€
\t7 lits :
\t153€
\tT7
\t6 chambres
\t>190m2
\t
\t6 lits :
\t195€
\t7 lits :
\t200€
\t8 lits :
\t205€
\t9 lits :
\t210€`,
    contentZonesR: `ANNEXE 2 - GRILLE ESTIMATIVE MÉNAGE





TYPOLOGIE APPARTEMENT
\tSUPERFICIE
\tEXEMPLE DE FORFAIT
[Ménage + Linge + Consommables]
\tStudio
\t1 seule pièce
\t> 30m2
\t
\t1 Lit :
\t65€
\t2 Lits :
\t70€
\tT1/T1bis
\t1 seule pièce
\t30-34m2
\t
\t1 lit :
\t69€
\t2 lits :
\t74€
\tT2
\t1 chambre
\t35-54m2
\t
\t1 lit :
\t75€
\t2 lits :
\t80€
\tT3
\t2 chambres
\t55-75m2
\t
\t2 lits :
\t92€
\t3 lits :
\t97€
\t4 lits :
\t102€
\tT4
\t3 chambres
\t80-100m2
\t
\t3 lits :
\t140€
\t4 lits :


\t145€
\t5 lits :
\t150€
\tTYPOLOGIE APPARTEMENT
\tSUPERFICIE
\tEXEMPLE DE FORFAIT
[Ménage + Linge + Consommables]
\tT5
\t4 chambres
\t100-150m2
\t
\t4 lits :
\t178€
\t5 lits :
\t183€
\t6 lits :
\t188€
\tT6
\t5 chambres
\t140-190m2
\t
\t5 lits :
\t226€
\t6 lits :
\t231€
\t7 lits :
\t236€
\tT7
\t6 chambres
\t>190m2
\t
\t6 lits :
\t303€
\t7 lits :
\t308€
\t8 lits :
\t313€
\t9 lits :
\t318€`,
    contentSansMenage: null,
  },
];

async function main() {
  console.log("Seeding articles...");

  for (const article of articles) {
    const fields = {
      title: article.title,
      orderIndex: article.orderIndex,
      scope: article.scope,
      contentCommon: article.contentCommon ?? null,
      contentParticulier: article.contentParticulier ?? null,
      contentSociete: article.contentSociete ?? null,
      contentZonesCj: article.contentZonesCj ?? null,
      contentZonesR: article.contentZonesR ?? null,
      contentSansMenage: article.contentSansMenage ?? null,
      contentClassique: article.contentClassique ?? null,
      contentStudio: article.contentStudio ?? null,
      content20pct: article.content20pct ?? null,
    };

    await prisma.article.upsert({
      where: { code: article.code },
      update: { ...fields },
      create: { code: article.code, ...fields },
    });

    console.log(`  Upserted: ${article.code}`);
  }

  console.log(`\nDone! ${articles.length} articles seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
