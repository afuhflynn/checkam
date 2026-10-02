-- AlterTable
ALTER TABLE "WhatsAppThread" ADD COLUMN     "lastVerdict" TEXT,
ADD COLUMN     "threadLanguage" TEXT,
ADD COLUMN     "windowFirstReplyAt" TIMESTAMP(3);
