import crypto from "node:crypto";
import { generateObject } from "ai";
import { z } from "zod";
import { extractEmails } from "../rules/email-rules";
import { extractCameroonPhoneNumbers } from "../rules/phone-normalizer";
import {
  PRIMARY_VISION_MODELS,
  isAiCircuitOpen,
  isCreditOrLimitError,
  openAiCircuit,
  MAX_OUTPUT_TOKENS,
  chatModel,
} from "./openrouter";

export const ExtractedFactsSchema = z.object({
  claimedEntity: z
    .string()
    .nullable()
    .describe(
      "Name or acronym of the organization, ministry, embassy, or company claimed (e.g. MINESEC, MINFOPRA, Orange Money, Canadian Embassy).",
    ),
  phoneNumbers: z.array(z.string()).describe("All phone numbers found in the document or message."),
  emails: z.array(z.string()).describe("All email addresses found in the document or message."),
  paymentMethod: z
    .string()
    .nullable()
    .describe(
      "Payment channel requested (e.g. Orange Money, MTN MoMo, Public Treasury, Crypto, Bank Transfer).",
    ),
  amount: z
    .string()
    .nullable()
    .describe("Any financial amount requested or promised (e.g. '25 000 FCFA', '75000 XAF')."),
  deadline: z
    .string()
    .nullable()
    .describe("Any urgency deadline or timeline claimed (e.g. 'Avant le 15 Mars', 'In 14 days')."),
  suspiciousPhrases: z
    .array(z.string())
    .describe(
      "Key suspect phrases found (e.g. 'frais de dossier', 'transfert par erreur', 'visa express 14 jours').",
    ),
  summaryClaim: z
    .string()
    .describe("A one sentence factual summary of what the notice offers or demands."),
});

export type ExtractedFacts = z.infer<typeof ExtractedFactsSchema>;

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function extractFactsFromTextOrImage(params: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<ExtractedFacts> {
  const { text, imageBase64, mimeType } = params;

  // If no AI key is configured, circuit is open, or offline fallback, run heuristics
  const hasValidApiKey =
    process.env.OPENROUTER_API_KEY?.startsWith("sk-or-") &&
    !process.env.OPENROUTER_API_KEY.includes("placeholder");

  if (!hasValidApiKey || isAiCircuitOpen()) {
    return runHeuristicExtractor(text || "");
  }

  // Attempt multi-model cascade with Vercel AI SDK v5+ (OpenRouter gateway)
  const systemPrompt =
    "You are an expert fact-extraction engine for Cameroon documents, SMS messages, flyers, and job offers. Your ONLY task is to extract concrete facts (names, phone numbers, emails, payment channels, amounts) strictly into the provided JSON schema. Do not make moral judgements; only extract factual data faithfully.";

  for (const modelName of PRIMARY_VISION_MODELS) {
    try {
      if (imageBase64) {
        const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;
        const { object } = await generateObject({
          model: chatModel(modelName),
          schema: ExtractedFactsSchema,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Read all text from this flyer or document image and extract the structured facts.",
                },
                { type: "image", image: dataUrl },
              ],
            },
          ],
          temperature: 0.1,
          maxOutputTokens: MAX_OUTPUT_TOKENS.extraction,
        });
        return object;
      }

      const { object } = await generateObject({
        model: chatModel(modelName),
        schema: ExtractedFactsSchema,
        system: systemPrompt,
        prompt: `Extract structured facts from the following text:\n\n${text ?? ""}`,
        temperature: 0.1,
        maxOutputTokens: MAX_OUTPUT_TOKENS.extraction,
      });

      return object;
    } catch (error) {
      console.warn(`[AI SDK] Fallback triggered from model ${modelName}:`, error);
      if (isCreditOrLimitError(error)) {
        openAiCircuit();
        break; // No point trying more models — credits/limits exhausted
      }
      // Continue to next model in cascade
    }
  }

  // Fallback to local heuristic extractor if all models in cascade fail
  return runHeuristicExtractor(text || "");
}

function runHeuristicExtractor(text: string): ExtractedFacts {
  const phones = extractCameroonPhoneNumbers(text).map((p) => p.normalized);
  const emails = extractEmails(text).map((e) => e.original);

  const lower = text.toLowerCase();
  let claimedEntity: string | null = null;
  if (lower.includes("minesec")) claimedEntity = "MINESEC";
  else if (lower.includes("minfopra")) claimedEntity = "MINFOPRA";
  else if (lower.includes("douane") || lower.includes("customs")) claimedEntity = "DOUANES";
  else if (lower.includes("orange money")) claimedEntity = "Orange Money";
  else if (lower.includes("mtn momo") || lower.includes("mtn mobile money"))
    claimedEntity = "MTN MoMo";
  else if (lower.includes("canada") || lower.includes("ambassade du canada"))
    claimedEntity = "Ambassade du Canada";
  else if (lower.includes("antic")) claimedEntity = "ANTIC";

  let paymentMethod: string | null = null;
  if (lower.includes("orange money")) paymentMethod = "Orange Money";
  else if (lower.includes("mtn momo") || lower.includes("momo")) paymentMethod = "MTN MoMo";
  else if (lower.includes("trésor public") || lower.includes("tresor public"))
    paymentMethod = "Trésor Public";

  // Match amount (e.g. 25 000 FCFA, 75.000 FCFA, 150000 XAF)
  const amountMatch = text.match(/\b\d{1,3}(?:[.,\s]\d{3})*\s*(?:FCFA|XAF|CFA|F\s?CFA|francs?)\b/i);
  const amount = amountMatch ? amountMatch[0] : null;

  const suspiciousPhrases: string[] = [];
  if (lower.includes("frais de dossier")) suspiciousPhrases.push("frais de dossier");
  if (lower.includes("quittance express")) suspiciousPhrases.push("quittance express");
  if (lower.includes("transfert par erreur")) suspiciousPhrases.push("transfert par erreur");
  if (lower.includes("visa express")) suspiciousPhrases.push("visa express");

  return {
    claimedEntity,
    phoneNumbers: phones,
    emails,
    paymentMethod,
    amount,
    deadline: null,
    suspiciousPhrases,
    summaryClaim: text.slice(0, 150),
  };
}
