-- CreateEnum
CREATE TYPE "WhatsAppReplyDecision" AS ENUM ('PENDING', 'SENT', 'REFUSED_WINDOW', 'REFUSED_CAP');

-- AlterTable
ALTER TABLE "WhatsAppWebhookEvent" ADD COLUMN     "inboundAt" TIMESTAMP(3),
ADD COLUMN     "replyDecision" "WhatsAppReplyDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "replyDecisionReason" TEXT,
ADD COLUMN     "threadKey" TEXT,
ADD COLUMN     "windowExpiresAtAtDecision" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WhatsAppThread" (
    "threadKey" TEXT NOT NULL,
    "normalizedNumber" TEXT,
    "waId" TEXT,
    "lastInboundAt" TIMESTAMP(3) NOT NULL,
    "windowExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastOutboundAt" TIMESTAMP(3),
    "capNoteSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppThread_pkey" PRIMARY KEY ("threadKey")
);

-- CreateTable
CREATE TABLE "WhatsAppUsageMonth" (
    "phoneNumberId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "repliesAttempted" INTEGER NOT NULL DEFAULT 0,
    "capAtMonthStart" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppUsageMonth_pkey" PRIMARY KEY ("phoneNumberId","month")
);

-- CreateIndex
CREATE INDEX "WhatsAppUsageMonth_month_idx" ON "WhatsAppUsageMonth"("month");

-- CreateIndex
CREATE INDEX "WhatsAppWebhookEvent_threadKey_idx" ON "WhatsAppWebhookEvent"("threadKey");

-- CreateIndex
CREATE INDEX "WhatsAppWebhookEvent_fromNumber_idx" ON "WhatsAppWebhookEvent"("fromNumber");

-- AddForeignKey
ALTER TABLE "WhatsAppWebhookEvent" ADD CONSTRAINT "WhatsAppWebhookEvent_threadKey_fkey" FOREIGN KEY ("threadKey") REFERENCES "WhatsAppThread"("threadKey") ON DELETE SET NULL ON UPDATE CASCADE;
