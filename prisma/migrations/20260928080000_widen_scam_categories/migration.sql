-- Widen ScamCategory beyond the original job-and-visa families. CheckAm is a
-- verification bureau, and users bring scholarships, money mule offers,
-- romance fraud, impersonation and prizes, all of which used to collapse into
-- OTHER and lose their evidence bullet.
ALTER TYPE "ScamCategory" ADD VALUE IF NOT EXISTS 'EDUCATION';
ALTER TYPE "ScamCategory" ADD VALUE IF NOT EXISTS 'MONEY_LAUNDERING';
ALTER TYPE "ScamCategory" ADD VALUE IF NOT EXISTS 'ROMANCE';
ALTER TYPE "ScamCategory" ADD VALUE IF NOT EXISTS 'IMPERSONATION';
ALTER TYPE "ScamCategory" ADD VALUE IF NOT EXISTS 'PRIZE';
