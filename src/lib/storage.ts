import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashContent } from "./ai/extract-facts";

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export interface SavedEvidence {
  url: string;
  mimeType: string;
  bytes: number;
}

/** Persist flyer evidence to public/uploads so registry dossiers can display it. */
export async function saveEvidenceFile(params: {
  base64: string;
  mimeType: string;
  slugHint?: string;
}): Promise<SavedEvidence> {
  const ext = ALLOWED_MIME[params.mimeType];
  if (!ext) {
    throw new Error("UNSUPPORTED_FILE_TYPE");
  }
  const buffer = Buffer.from(params.base64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_EVIDENCE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  const hash = hashContent(params.base64.slice(0, 5000)).slice(0, 16);
  const safeHint = (params.slugHint ?? "evidence").replace(/[^a-z0-9-]+/gi, "-").slice(0, 40);
  const filename = `${safeHint}-${Date.now().toString(36)}-${hash}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "evidence");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return { url: `/uploads/evidence/${filename}`, mimeType: params.mimeType, bytes: buffer.length };
}
