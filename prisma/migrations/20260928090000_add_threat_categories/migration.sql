-- Coercive threats and phishing sit outside the scam families. Someone being
-- blackmailed or sextorted needs different guidance from someone who was asked
-- for a dossier fee, so the category has to reach the safety copy.
ALTER TYPE "ScamCategory" ADD VALUE IF NOT EXISTS 'EXTORTION';
ALTER TYPE "ScamCategory" ADD VALUE IF NOT EXISTS 'SEXTORTION';
ALTER TYPE "ScamCategory" ADD VALUE IF NOT EXISTS 'PHISHING';
