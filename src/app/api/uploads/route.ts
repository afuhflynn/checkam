import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aj } from "../../../lib/arcjet";
import { saveEvidenceFile } from "../../../lib/storage";

const UploadSchema = z.object({
  base64: z.string().min(100).max(9_500_000),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]),
  slugHint: z.string().max(60).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const decision = await aj.protect(req, { requested: 1 });
    if (decision.isDenied()) {
      return NextResponse.json({ error: "Rate limited." }, { status: 429 });
    }
    const rawBody: unknown = await req.json();
    const parsed = UploadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid file payload." }, { status: 400 });
    }
    const saved = await saveEvidenceFile(parsed.data);
    return NextResponse.json({ success: true, ...saved });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Upload failed";
    const status = msg === "UNSUPPORTED_FILE_TYPE" || msg === "FILE_TOO_LARGE" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
