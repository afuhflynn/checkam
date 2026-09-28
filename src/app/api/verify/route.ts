import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  type ExtractedFacts,
  extractFactsFromTextOrImage,
  hashContent,
} from "../../../lib/ai/extract-facts";
import { researchTurn } from "../../../lib/agent/runner";
import { aj } from "../../../lib/arcjet";
import { db } from "../../../lib/db";
import { detectMessageLanguage } from "../../../lib/i18n/detect";
import { runRulesEngine } from "../../../lib/rules/engine";
import { normalizeCameroonPhone } from "../../../lib/rules/phone-normalizer";

const VerifyBodySchema = z.object({
  inputType: z.enum(["TEXT", "IMAGE", "PDF", "PHONE", "EMAIL"]).default("TEXT"),
  content: z.string().max(8000).default(""),
  imageBase64: z.string().max(9_500_000).optional(),
  mimeType: z.string().max(100).optional(),
});

type VerifyBody = z.infer<typeof VerifyBodySchema>;

export async function POST(req: NextRequest) {
  try {
    // 1. Arcjet Security Check (Rate limiting + Bot defense)
    const decision = await aj.protect(req, { requested: 1 });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return NextResponse.json(
          { error: "Too many verification requests. Please wait a minute." },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: "Access denied by security shield." }, { status: 403 });
    }

    const rawBody: unknown = await req.json();
    const parsed = VerifyBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid verification payload." }, { status: 400 });
    }
    const { inputType, content, imageBase64, mimeType }: VerifyBody = parsed.data;

    if (!content && !imageBase64) {
      return NextResponse.json(
        { error: "Please provide text content or upload a document/flyer." },
        { status: 400 },
      );
    }

    // 2. Compute Payload Hash for caching (same flyer is never re-read by AI)
    const payloadHash = hashContent(
      imageBase64 ? `img:${mimeType ?? "bin"}:${imageBase64.slice(0, 2000)}` : `txt:${content}`,
    );

    // 2b. Reuse cached AI extraction when available (saves OpenRouter credits)
    let cachedFacts: ExtractedFacts | null = null;
    try {
      const cached = await db.scamVerification.findFirst({
        where: { fileHash: payloadHash },
        orderBy: { createdAt: "desc" },
        select: { extractedFacts: true },
      });
      if (cached?.extractedFacts && typeof cached.extractedFacts === "object") {
        cachedFacts = cached.extractedFacts as unknown as ExtractedFacts;
      }
    } catch {
      cachedFacts = null; // Cache is best-effort; never block verification
    }

    // 3. Check for known flagged identifiers in Database
    let isKnownFlaggedInDb = false;
    const isKnownApprovedInDb = false;

    if (inputType === "PHONE" || inputType === "TEXT") {
      const parsedPhone = normalizeCameroonPhone(content);
      if (parsedPhone.isValid) {
        const flagged = await db.flaggedIdentifier.findFirst({
          where: {
            normalizedValue: parsedPhone.normalized,
            isActive: true,
          },
        });
        if (flagged) {
          isKnownFlaggedInDb = true;
        }
      }
    }

    // 4. Research via the shared agent path (facts plus web corroboration
    // plus sources), falling back to raw extraction when research fails.
    // Same brain as chat, so both surfaces agree.
    const locale = detectMessageLanguage(content);
    let extractedFacts: ExtractedFacts;
    let webCorroboration: {
      foundOfficialSource: boolean;
      sources: { title: string; url: string }[];
    } | null = null;
    try {
      const researched = await researchTurn({ text: content, locale });
      if (researched.facts) {
        extractedFacts = researched.facts;
        webCorroboration = {
          foundOfficialSource: researched.corroborated,
          sources: researched.sources,
        };
      } else {
        extractedFacts =
          cachedFacts ??
          (await extractFactsFromTextOrImage({
            text: content,
            imageBase64,
            mimeType,
          }));
      }
    } catch {
      extractedFacts =
        cachedFacts ??
        (await extractFactsFromTextOrImage({
          text: content,
          imageBase64,
          mimeType,
        }));
    }

    // Check if any of the extracted phones/emails are in the flagged database
    if (!isKnownFlaggedInDb && extractedFacts.phoneNumbers.length > 0) {
      const flagged = await db.flaggedIdentifier.findFirst({
        where: {
          normalizedValue: { in: extractedFacts.phoneNumbers },
          isActive: true,
        },
      });
      if (flagged) {
        isKnownFlaggedInDb = true;
      }
    }

    // 5. Execute Pure Rules Engine (Rules dictate the verdict)
    const verification = runRulesEngine({
      text: content || extractedFacts.summaryClaim,
      claimedEntity: extractedFacts.claimedEntity,
      phoneNumbers: extractedFacts.phoneNumbers,
      emails: extractedFacts.emails,
      amount: extractedFacts.amount,
      paymentMethod: extractedFacts.paymentMethod,
      isKnownFlaggedInDb,
      isKnownApprovedInDb,
      webCorroboration,
    });

    // 6. Record Verification session in Database
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const clientIpHash = hashContent(clientIp);

    await db.scamVerification.create({
      data: {
        inputType,
        queryContent: content.slice(0, 1000),
        fileHash: payloadHash,
        extractedFacts: JSON.parse(JSON.stringify(extractedFacts)),
        verdict: verification.verdict,
        score: verification.score,
        evidenceBullets: JSON.parse(JSON.stringify(verification.evidenceBullets)),
        whatsappWarning: verification.whatsappWarning.fr,
        clientIpHash,
      },
    });

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error("[Verify API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during verification. Please try again." },
      { status: 500 },
    );
  }
}
