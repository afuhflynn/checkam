import type { VerificationResult } from "../rules/engine";

// The dossier shape the chat client renders. One builder, used by the live
// transport stream and by the rehydration endpoint, so the two can never
// drift apart and leave a half-populated card after a reload.
export interface VerdictPayload {
  verdict: string;
  score: number;
  category: string;
  bullets: string[];
  tones: ("warning" | "reassuring" | "neutral")[];
  safetyNote: string;
  shareText: string;
  shareTextPlain: string;
  verificationId: string;
  sources: { title: string; url: string }[];
}

// verificationId is the row's own primary key, so it is stamped on by the
// caller rather than baked in. That lets the same shape be persisted and then
// rehydrated without a placeholder.
export type StoredDossier = Omit<VerdictPayload, "verificationId">;

// Persisted rows predate evidenceTones, so a rehydrated verdict may carry no
// tone array. Falling back to "warning" is the safe direction: an old finding
// that eased the score shows up as a flag rather than being hidden.
export function buildVerdictPayload(params: {
  result: VerificationResult;
  locale: "en" | "fr";
}): StoredDossier {
  const { result, locale } = params;
  const fr = locale === "fr";
  const tones = (result.evidenceTones ?? []).slice(0, result.evidenceBullets.en.length);
  return {
    verdict: result.verdict,
    score: result.score,
    category: result.category,
    bullets: fr ? result.evidenceBullets.fr : result.evidenceBullets.en,
    tones: result.evidenceBullets.en.map((_, i) => tones[i] ?? "warning"),
    safetyNote: fr ? result.safetyNote.fr : result.safetyNote.en,
    shareText: fr ? result.whatsappWarning.fr : result.whatsappWarning.en,
    shareTextPlain: fr ? result.whatsappWarningPlain.fr : result.whatsappWarningPlain.en,
    sources: result.sources ?? [],
  };
}
