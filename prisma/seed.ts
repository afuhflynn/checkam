import {
  IdentifierType,
  PrismaClient,
  ReportStatus,
  Role,
  ScamCategory,
  VerdictStatus,
} from "@prisma/client";
import { CAMEROON_OFFICIAL_ENTITIES } from "../src/lib/rules/cameroon-entities";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CheckAm Cameroon Database...");

  // 1. Seed Official Cameroon Institutions
  for (const entity of CAMEROON_OFFICIAL_ENTITIES) {
    await prisma.officialEntity.upsert({
      where: { acronym: entity.acronym },
      update: {
        nameEn: entity.nameEn,
        nameFr: entity.nameFr,
        officialDomains: entity.officialDomains,
        paymentRules: entity.authorizedPaymentChannels.fr,
        websiteUrl: entity.officialWebsites[0] || "https://www.prc.cm",
        anticHotline: entity.anticHotline,
      },
      create: {
        acronym: entity.acronym,
        nameEn: entity.nameEn,
        nameFr: entity.nameFr,
        officialDomains: entity.officialDomains,
        officialPhoneNumbers: entity.officialHotline ? [entity.officialHotline] : [],
        paymentRules: entity.authorizedPaymentChannels.fr,
        websiteUrl: entity.officialWebsites[0] || "https://www.prc.cm",
        anticHotline: entity.anticHotline,
      },
    });
  }

  // 2. Seed Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@checkam.cm" },
    update: { role: Role.ADMIN },
    create: {
      email: "admin@checkam.cm",
      name: "CheckAm Super Admin",
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  // 3. Seed Confirmed Scam Cases into the Public Registry
  const seedScams = [
    {
      slug: "fake-minesec-325-teachers-recruitment-2025",
      title: "Faux avis de recrutement spécial des 325 instituteurs au MINESEC",
      description:
        "Faux communiqué circulant sur WhatsApp prétendant un recrutement direct de 325 enseignants au MINESEC, exigeant 25 000 FCFA de frais de dossier par Orange Money sur le numéro 699 12 34 56 et utilisant l'adresse non officielle minesec.recrutement2025@gmail.com.",
      category: ScamCategory.CIVIL_SERVICE,
      status: ReportStatus.APPROVED,
      targetEntity: "MINESEC",
      amountRequested: "25 000 FCFA",
      contactPhone: "+237699123456",
      contactEmail: "minesec.recrutement2025@gmail.com",
      paymentDetails: "Orange Money au 699123456",
      submitterEmail: "antic-alert@antic.cm",
      publishedAt: new Date("2025-02-10T10:00:00Z"),
      moderatedById: adminUser.id,
      flagged: [
        {
          type: IdentifierType.PHONE,
          value: "+237699123456",
          normalized: "+237699123456",
          category: ScamCategory.CIVIL_SERVICE,
        },
        {
          type: IdentifierType.EMAIL,
          value: "minesec.recrutement2025@gmail.com",
          normalized: "minesec.recrutement2025@gmail.com",
          category: ScamCategory.CIVIL_SERVICE,
        },
      ],
    },
    {
      slug: "orange-money-75000-reversal-sms-fraud",
      title: "Arnaque au faux virement Orange Money de 75 000 FCFA",
      description:
        "SMS d'escroquerie imitant un transfert Orange Money suivi d'un appel suppliant la victime de 'renvoyer' 75 000 FCFA prétendument envoyés par erreur vers le numéro 698 00 11 22.",
      category: ScamCategory.MOBILE_MONEY,
      status: ReportStatus.APPROVED,
      targetEntity: "Orange Money",
      amountRequested: "75 000 FCFA",
      contactPhone: "+237698001122",
      paymentDetails: "Orange Money 698001122",
      submitterEmail: "community@checkam.cm",
      publishedAt: new Date("2025-02-14T14:30:00Z"),
      moderatedById: adminUser.id,
      flagged: [
        {
          type: IdentifierType.PHONE,
          value: "+237698001122",
          normalized: "+237698001122",
          category: ScamCategory.MOBILE_MONEY,
        },
      ],
    },
    {
      slug: "express-canada-work-visa-14-days-guarantee",
      title: "Faux visa de travail Canada express en 14 jours avec logement offert",
      description:
        "Campagne Facebook frauduleuse promettant un visa de travail canadien garanti en 14 jours sans test de langue pour 150 000 FCFA de frais de timbre express à payer par MTN MoMo sur le 677 44 55 66.",
      category: ScamCategory.VISA_TRAVEL,
      status: ReportStatus.APPROVED,
      targetEntity: "Ambassade du Canada",
      amountRequested: "150 000 FCFA",
      contactPhone: "+237677445566",
      contactEmail: "visa.canada.immigration.express@gmail.com",
      paymentDetails: "MTN MoMo 677445566",
      submitterEmail: "alert@checkam.cm",
      publishedAt: new Date("2025-02-18T09:15:00Z"),
      moderatedById: adminUser.id,
      flagged: [
        {
          type: IdentifierType.PHONE,
          value: "+237677445566",
          normalized: "+237677445566",
          category: ScamCategory.VISA_TRAVEL,
        },
        {
          type: IdentifierType.EMAIL,
          value: "visa.canada.immigration.express@gmail.com",
          normalized: "visa.canada.immigration.express@gmail.com",
          category: ScamCategory.VISA_TRAVEL,
        },
      ],
    },
    {
      slug: "fake-douanes-cameroon-port-auction-facebook",
      title: "Fausses ventes aux enchères du Port de Douala sur Facebook",
      description:
        "Page Facebook 'Ventes aux Enchères Douanes Camerounaises' demandant une caution de réservation de 50 000 FCFA via MoMo sur le 654 22 33 44 pour l'achat de véhicules saisis.",
      category: ScamCategory.ECOMMERCE,
      status: ReportStatus.APPROVED,
      targetEntity: "DOUANES",
      amountRequested: "50 000 FCFA",
      contactPhone: "+237654223344",
      paymentDetails: "MTN MoMo 654223344",
      submitterEmail: "douanes-vigilance@antic.cm",
      publishedAt: new Date("2025-02-20T11:00:00Z"),
      moderatedById: adminUser.id,
      flagged: [
        {
          type: IdentifierType.PHONE,
          value: "+237654223344",
          normalized: "+237654223344",
          category: ScamCategory.ECOMMERCE,
        },
      ],
    },
  ];

  for (const scam of seedScams) {
    const report = await prisma.scamReport.upsert({
      where: { slug: scam.slug },
      update: {
        title: scam.title,
        description: scam.description,
        category: scam.category,
        status: scam.status,
        targetEntity: scam.targetEntity,
        amountRequested: scam.amountRequested,
        contactPhone: scam.contactPhone,
        contactEmail: scam.contactEmail,
        paymentDetails: scam.paymentDetails,
        publishedAt: scam.publishedAt,
        moderatedById: scam.moderatedById,
      },
      create: {
        slug: scam.slug,
        title: scam.title,
        description: scam.description,
        category: scam.category,
        status: scam.status,
        targetEntity: scam.targetEntity,
        amountRequested: scam.amountRequested,
        evidenceUrls: [],
        contactPhone: scam.contactPhone,
        contactEmail: scam.contactEmail,
        paymentDetails: scam.paymentDetails,
        submitterEmail: scam.submitterEmail,
        publishedAt: scam.publishedAt,
        moderatedById: scam.moderatedById,
      },
    });

    for (const flag of scam.flagged) {
      await prisma.flaggedIdentifier.create({
        data: {
          type: flag.type,
          value: flag.value,
          normalizedValue: flag.normalized,
          riskLevel: VerdictStatus.HIGH_RISK,
          category: flag.category,
          reportId: report.id,
          notes: `Signalé dans le dossier: ${report.title}`,
        },
      });
    }
  }

  console.log("Database seeded successfully with Cameroon official entities and scam registries!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
