import { authHeader, hasSendCredentials, phoneNumberId } from "./config";
import { graphUrl } from "./graph";

/**
 * Every outbound Meta call goes through here (spec 0015, AC-1).
 * The worker never builds a URL and never holds a token.
 */

export interface SendResult {
  ok: boolean;
  status: number;
  /** Meta's message id when the send was accepted, for the run history. */
  messageId: string | null;
  /** Meta error code when the send was refused, for the refusal reason. */
  errorCode: number | null;
  errorMessage: string | null;
}

/**
 * Send one free form text message. The caller is responsible for having checked
 * the 24 hour window and the monthly cap first: this function sends whatever it
 * is handed, which is why it takes the body as an argument and never renders.
 */
export async function sendText(to: string, body: string): Promise<SendResult> {
  const id = phoneNumberId();
  if (!id) {
    return {
      ok: false,
      status: 0,
      messageId: null,
      errorCode: null,
      errorMessage: "WHATSAPP_PHONE_NUMBER_ID is not configured",
    };
  }

  const res = await fetch(graphUrl(`${id}/messages`), {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  return readSendResponse(res);
}

/** Parse the body, not just the status: a 200 still carries a per message result. */
async function readSendResponse(res: Response): Promise<SendResult> {
  let messageId: string | null = null;
  let errorCode: number | null = null;
  let errorMessage: string | null = null;
  // A 200 only means Meta accepted the request, never that a person received
  // it. Whether we could read the body is therefore part of the answer: without
  // it we have no message id to prove delivery, and reporting success would mark
  // the event complete so it never retries.
  let bodyRead = false;

  try {
    const payload = (await res.json()) as {
      messages?: { id?: string }[];
      error?: { code?: number; message?: string };
    };
    messageId = payload.messages?.[0]?.id ?? null;
    errorCode = payload.error?.code ?? null;
    errorMessage = payload.error?.message ?? null;
    bodyRead = true;
  } catch {
    // A body we cannot read is not a send we can claim succeeded.
  }

  return {
    // Confirmed means we hold Meta's own message id. Absence of an error is not
    // proof: a 200 can arrive with a body that carries neither an id nor an
    // error, and treating that as delivered would mark the event complete so it
    // never retries. An unprovable send has to read as a refusal.
    ok: res.ok && bodyRead && messageId !== null && errorCode === null,
    status: res.status,
    messageId,
    errorCode,
    errorMessage,
  };
}

/**
 * Local development has no Meta credentials, so the worker logs the body it
 * would have sent instead of pretending a message went out. Production can
 * never take this path (spec 0015, AC-10).
 */
export function isMockDispatchAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && !hasSendCredentials();
}
