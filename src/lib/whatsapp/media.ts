import { authHeader } from "./config";
import { graphUrl } from "./graph";

/**
 * Inbound media download (spec 0015, AC-1). Two hops: the media id resolves to
 * a short lived CDN URL, and that URL is fetched with the same bearer token.
 */

export interface MediaPayload {
  buffer: Buffer;
  mimeType: string;
}

/** Meta error 131052: the media could not be downloaded. */
const MEDIA_DOWNLOAD_FAILED = 131052;

export async function downloadMedia(
  mediaId: string,
): Promise<{ ok: true; media: MediaPayload } | { ok: false; errorCode: number; message: string }> {
  const metaRes = await fetch(graphUrl(mediaId), {
    headers: { Authorization: authHeader() },
  });
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };

  if (!meta.url) {
    return {
      ok: false,
      errorCode: MEDIA_DOWNLOAD_FAILED,
      message: "Meta returned no media URL",
    };
  }

  const binRes = await fetch(meta.url, {
    headers: { Authorization: authHeader() },
  });
  if (!binRes.ok) {
    return {
      ok: false,
      errorCode: MEDIA_DOWNLOAD_FAILED,
      message: `Media binary responded ${binRes.status}`,
    };
  }

  return {
    ok: true,
    media: {
      buffer: Buffer.from(await binRes.arrayBuffer()),
      mimeType: meta.mime_type || "image/jpeg",
    },
  };
}
