export interface OfficialInstitution {
  id: string;
  acronym: string;
  nameEn: string;
  nameFr: string;
  officialDomains: string[];
  officialWebsites: string[];
  authorizedPaymentChannels: {
    en: string;
    fr: string;
  };
  anticHotline: string;
  officialHotline?: string;
  notes: {
    en: string;
    fr: string;
  };
}

export const CAMEROON_OFFICIAL_ENTITIES: OfficialInstitution[] = [
  {
    id: "minesec",
    acronym: "MINESEC",
    nameEn: "Ministry of Secondary Education",
    nameFr: "Ministère des Enseignements Secondaires",
    officialDomains: ["minesec.gov.cm", "minesec.cm"],
    officialWebsites: ["https://www.minesec.gov.cm"],
    authorizedPaymentChannels: {
      en: "Public Treasury Receipt (Quittance du Trésor) or authorized ministerial bank partners only. NEVER personal Mobile Money.",
      fr: "Quittance du Trésor Public ou banques partenaires agréées. JAMAIS de compte Mobile Money personnel.",
    },
    anticHotline: "8202",
    notes: {
      en: "MINESEC recruitment notices are published exclusively via official ministerial decrees and CRTV, never with Gmail contact addresses.",
      fr: "Les arrêtés de concours ou de recrutement du MINESEC sont signés par le Ministre et publiés via la CRTV et le site officiel, jamais avec une adresse Gmail.",
    },
  },
  {
    id: "minfopra",
    acronym: "MINFOPRA",
    nameEn: "Ministry of Public Service and Administrative Reform",
    nameFr: "Ministère de la Fonction Publique et de la Réforme Administrative",
    officialDomains: ["minfopra.gov.cm"],
    officialWebsites: ["http://www.minfopra.gov.cm"],
    authorizedPaymentChannels: {
      en: "Treasury receipts issued at Regional Delegations or official MINFOPRA portal. Never individual phone numbers.",
      fr: "Quittance du Trésor délivrée aux Délégations Régionales ou sur la plateforme officielle MINFOPRA. Jamais de numéro de téléphone individuel.",
    },
    anticHotline: "8202",
    notes: {
      en: "Integration into the Cameroon Civil Service is exclusively through official competitive exams (Concours). Any 'direct recruitment' via WhatsApp is fraudulent.",
      fr: "L'accès à la Fonction Publique camerounaise se fait uniquement par voie de concours officiel ou arrêté présidentiel. Tout 'recrutement direct' sur WhatsApp est une arnaque.",
    },
  },
  {
    id: "prc",
    acronym: "PRC",
    nameEn: "Presidency of the Republic of Cameroon",
    nameFr: "Présidence de la République du Cameroun",
    officialDomains: ["prc.cm", "presidenceducameroun.com"],
    officialWebsites: ["https://www.prc.cm"],
    authorizedPaymentChannels: {
      en: "State public budget. No fees are ever solicited from citizens.",
      fr: "Budget de l'État. Aucun frais n'est jamais exigé des citoyens.",
    },
    anticHotline: "8202",
    notes: {
      en: "Official presidential communiqués and decrees are published on prc.cm and broadcasted on national media.",
      fr: "Les communiqués et décrets présidentiels sont publiés sur prc.cm et diffusés sur les médias nationaux.",
    },
  },
  {
    id: "antic",
    acronym: "ANTIC",
    nameEn: "National Agency for Information and Communication Technologies",
    nameFr: "Agence Nationale des Technologies de l'Information et de la Communication",
    officialDomains: ["antic.cm"],
    officialWebsites: ["https://www.antic.cm", "https://cybersecurite.antic.cm"],
    authorizedPaymentChannels: {
      en: "Government public treasury.",
      fr: "Trésor public de l'État.",
    },
    anticHotline: "8202",
    officialHotline: "8202",
    notes: {
      en: "National cybersecurity authority. Report cybercrime and fraudulent numbers free of charge at hotline 8202.",
      fr: "Autorité nationale de cybersécurité. Signalez gratuitement les cyberarnaques et numéros suspects au numéro vert 8202.",
    },
  },
  {
    id: "dgsn",
    acronym: "DGSN",
    nameEn: "General Delegation for National Security (Cameroon Police)",
    nameFr: "Délégation Générale à la Sûreté Nationale (Police Camerounaise)",
    officialDomains: ["dgsn.cm", "passcam.cm"],
    officialWebsites: ["https://www.dgsn.cm", "https://www.passcam.cm"],
    authorizedPaymentChannels: {
      en: "Official Passcam pre-enrolment portal (integrated certified gateway) or Public Treasury for police entrance concours.",
      fr: "Portail officiel de pré-enrôlement Passcam ou Trésor Public pour les concours de police.",
    },
    anticHotline: "8202",
    officialHotline: "1500",
    notes: {
      en: "Police concours fees are paid against Treasury receipts. No police commissioner recruits via WhatsApp.",
      fr: "Les frais de concours de police se paient contre quittance du Trésor. Aucun commissaire de police ne recrute via WhatsApp.",
    },
  },
  {
    id: "minsante",
    acronym: "MINSANTE",
    nameEn: "Ministry of Public Health",
    nameFr: "Ministère de la Santé Publique",
    officialDomains: ["minsante.cm", "minsante.gov.cm"],
    officialWebsites: ["https://www.minsante.cm"],
    authorizedPaymentChannels: {
      en: "Public Treasury Receipt or official designated health facility.",
      fr: "Quittance du Trésor ou régie officielle des structures sanitaires.",
    },
    anticHotline: "8202",
    officialHotline: "1510",
    notes: {
      en: "Recruitments and medical concours are signed by the Minister of Public Health.",
      fr: "Les recrutements et concours des personnels médicaux sont signés par le Ministre de la Santé Publique.",
    },
  },
  {
    id: "douanes",
    acronym: "DOUANES",
    nameEn: "Directorate General of Customs Cameroon",
    nameFr: "Direction Générale des Douanes Camerounaises",
    officialDomains: ["douanes.cm", "douanescustoms-cameroun.net"],
    officialWebsites: ["https://www.douanes.cm"],
    authorizedPaymentChannels: {
      en: "Official Customs Revenue offices at Port of Douala/Kribi or Campost/Treasury counters. Never private MoMo transfers.",
      fr: "Régies des Douanes aux ports de Douala/Kribi ou guichets Campost/Trésor. Jamais de transferts MoMo privés.",
    },
    anticHotline: "8202",
    notes: {
      en: "Customs auctions (Ventes aux enchères des douanes) on Facebook demanding advance MoMo payments for cars or electronics are 100% scams.",
      fr: "Les prétendues 'ventes aux enchères des douanes' sur Facebook exigeant un paiement MoMo préalable pour des véhicules ou téléphones sont des arnaques à 100%.",
    },
  },
  {
    id: "minesup",
    acronym: "MINESUP",
    nameEn: "Ministry of Higher Education",
    nameFr: "Ministère de l'Enseignement Supérieur",
    officialDomains: ["minesup.gov.cm"],
    officialWebsites: ["https://www.minesup.gov.cm"],
    authorizedPaymentChannels: {
      en: "Express Union, designated commercial banks, or official university accounts with stamped receipt.",
      fr: "Express Union, banques partenaires désignées, ou comptes universitaires officiels avec reçu cacheté.",
    },
    anticHotline: "8202",
    notes: {
      en: "Concours for Grandes Écoles (ENSP, ENS, CUSS, IRIC, ESSTIC, ENAM) require verified ministerial communiqué.",
      fr: "Les concours des Grandes Écoles (ENSP, ENS, CUSS, IRIC, ESSTIC, ENAM) font l'objet d'un arrêté ministériel officiel.",
    },
  },
  {
    id: "cnps",
    acronym: "CNPS",
    nameEn: "National Social Insurance Fund",
    nameFr: "Caisse Nationale de Prévoyance Sociale",
    officialDomains: ["cnps.cm"],
    officialWebsites: ["https://www.cnps.cm"],
    authorizedPaymentChannels: {
      en: "CNPS official accounts or certified banking partners.",
      fr: "Comptes officiels CNPS ou partenaires bancaires certifiés.",
    },
    anticHotline: "8202",
    notes: {
      en: "CNPS never demands payments on personal mobile numbers to release pensions or family allowances.",
      fr: "La CNPS ne demande jamais de paiement sur un numéro personnel pour débloquer des pensions ou allocations familiales.",
    },
  },
];

export function findOfficialEntity(queryText: string): OfficialInstitution | null {
  const normalized = queryText.toLowerCase();
  for (const entity of CAMEROON_OFFICIAL_ENTITIES) {
    if (
      normalized.includes(entity.acronym.toLowerCase()) ||
      normalized.includes(entity.nameEn.toLowerCase()) ||
      normalized.includes(entity.nameFr.toLowerCase()) ||
      entity.officialDomains.some((domain) => normalized.includes(domain))
    ) {
      return entity;
    }
  }
  return null;
}
