import { mkdir, unlink, writeFile } from "node:fs/promises";
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
export async function saveEvidenceFile(params: {  base64: string;
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

/**
 * Delete stored chat attachments by key. Local `/uploads/…` keys unlink
 * from disk; Blob `chat/…` keys delete through the Blob driver when its
 * token is set, otherwise they log for later cleanup.
 */
export async function deleteStoredFiles(keys: string[]): Promise<{ deleted: number }> {
  let deleted = 0;
  for (const key of keys) {
    try {
      if (key.startsWith("/uploads/")) {
        await unlink(path.join(process.cwd(), "public", key));
        deleted += 1;
      } else if (key.startsWith("chat/") && process.env.BLOB_READ_WRITE_TOKEN) {
        const { del } = await import("@vercel/blob");
        await del(key);
        deleted += 1;
      } else {
        console.log(`[storage] Blob delete pending token for key: ${key}`);
      }
    } catch (err) {
      console.warn(`[storage] delete failed for key: ${key}`, err);
    }
  }
  return { deleted };
}

const CHAT_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export interface SavedChatFile {
  key: string;
  url: string;
  mimeType: string;
  bytes: number;
}

/** Chat flyer upload (spec 0005 AC-5): local driver in dev, Blob in prod. */
export async function saveChatFile(params: {
  bytes: Buffer;
  mimeType: string;
  sessionId: string;
}): Promise<SavedChatFile> {
  const ext = CHAT_MIME[params.mimeType];
  if (!ext) throw new Error("UNSUPPORTED_FILE_TYPE");
  if (params.bytes.length === 0 || params.bytes.length > MAX_EVIDENCE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  const stamp = Date.now().toString(36);
  const rand = hashContent(params.bytes.subarray(0, 4096).toString("base64")).slice(0, 8);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const key = `chat/${params.sessionId}/${stamp}-${rand}.${ext}`;
    const saved = await put(key, params.bytes, {
      access: "public",
      contentType: params.mimeType,
    });
    return { key, url: saved.url, mimeType: params.mimeType, bytes: params.bytes.length };
  }

  const filename = `${stamp}-${rand}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "chat", params.sessionId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), params.bytes);
  const key = `/uploads/chat/${params.sessionId}/${filename}`;
  return { key, url: key, mimeType: params.mimeType, bytes: params.bytes.length };
}
