/*
  Warnings:

  - The values [EDUCATION,MONEY_LAUNDERING,ROMANCE,IMPERSONATION,PRIZE] on the enum `ScamCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ScamCategory_new" AS ENUM ('CIVIL_SERVICE', 'VISA_TRAVEL', 'MOBILE_MONEY', 'INVESTMENT_PONZI', 'ECOMMERCE', 'OTHER');
ALTER TABLE "public"."FlaggedIdentifier" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "ScamReport" ALTER COLUMN "category" TYPE "ScamCategory_new" USING ("category"::text::"ScamCategory_new");
ALTER TABLE "FlaggedIdentifier" ALTER COLUMN "category" TYPE "ScamCategory_new" USING ("category"::text::"ScamCategory_new");
ALTER TYPE "ScamCategory" RENAME TO "ScamCategory_old";
ALTER TYPE "ScamCategory_new" RENAME TO "ScamCategory";
DROP TYPE "public"."ScamCategory_old";
ALTER TABLE "FlaggedIdentifier" ALTER COLUMN "category" SET DEFAULT 'OTHER';
COMMIT;
