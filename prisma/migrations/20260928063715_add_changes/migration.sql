-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerdictStatus" AS ENUM ('HIGH_RISK', 'CAUTION', 'VERIFIED_OFFICIAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScamCategory" AS ENUM ('CIVIL_SERVICE', 'VISA_TRAVEL', 'MOBILE_MONEY', 'INVESTMENT_PONZI', 'ECOMMERCE', 'OTHER');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('PHONE', 'EMAIL', 'DOMAIN', 'MOMO_ACCOUNT', 'BANK_ACCOUNT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "queryContent" TEXT,
    "fileHash" TEXT,
    "extractedFacts" JSONB,
    "verdict" "VerdictStatus" NOT NULL,
    "score" INTEGER NOT NULL,
    "evidenceBullets" JSONB NOT NULL,
    "whatsappWarning" TEXT,
    "clientIpHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "auth_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScamReport" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ScamCategory" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "targetEntity" TEXT,
    "amountRequested" TEXT,
    "evidenceUrls" TEXT[],
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "paymentDetails" TEXT,
    "submitterEmail" TEXT,
    "submitterIpHash" TEXT,
    "moderatedById" TEXT,
    "moderatorNotes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScamReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlaggedIdentifier" (
    "id" TEXT NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "riskLevel" "VerdictStatus" NOT NULL DEFAULT 'HIGH_RISK',
    "category" "ScamCategory" NOT NULL DEFAULT 'OTHER',
    "reportId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlaggedIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialEntity" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "officialDomains" TEXT[],
    "officialPhoneNumbers" TEXT[],
    "paymentRules" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "anticHotline" TEXT NOT NULL DEFAULT '8202',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficialEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppWebhookEvent" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "processedStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "replyText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_folders" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "folderId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'New check',
    "guestKey" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "toolCalls" JSONB NOT NULL DEFAULT '[]',
    "tokenUse" JSONB,
    "verificationId" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "auth_verifications_identifier_value_key" ON "auth_verifications"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "ScamReport_slug_key" ON "ScamReport"("slug");

-- CreateIndex
CREATE INDEX "FlaggedIdentifier_normalizedValue_idx" ON "FlaggedIdentifier"("normalizedValue");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialEntity_acronym_key" ON "OfficialEntity"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppWebhookEvent_messageId_key" ON "WhatsAppWebhookEvent"("messageId");

-- CreateIndex
CREATE INDEX "chat_folders_ownerId_updatedAt_idx" ON "chat_folders"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "chat_folders_ownerId_name_key" ON "chat_folders"("ownerId", "name");

-- CreateIndex
CREATE INDEX "chat_sessions_ownerId_updatedAt_idx" ON "chat_sessions"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "chat_sessions_guestKey_updatedAt_idx" ON "chat_sessions"("guestKey", "updatedAt");

-- CreateIndex
CREATE INDEX "chat_messages_sessionId_createdAt_idx" ON "chat_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_sessionId_seq_key" ON "chat_messages"("sessionId", "seq");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScamReport" ADD CONSTRAINT "ScamReport_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlaggedIdentifier" ADD CONSTRAINT "FlaggedIdentifier_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ScamReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_folders" ADD CONSTRAINT "chat_folders_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "chat_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "verifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
