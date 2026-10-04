-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "preferredLanguageSource" TEXT,
ADD COLUMN     "preferredLanguageUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WhatsAppThread" ADD COLUMN     "askSentAt" TIMESTAMP(3),
ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "preferredLanguageSource" TEXT,
ADD COLUMN     "preferredLanguageUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WhatsAppWebhookEvent" ADD COLUMN     "replyLanguage" TEXT;

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "askSentAt" TIMESTAMP(3),
ADD COLUMN     "replyLanguage" TEXT,
ADD COLUMN     "replyLanguageSource" TEXT,
ADD COLUMN     "replyLanguageUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "verifications" ADD COLUMN     "replyLanguage" TEXT;
