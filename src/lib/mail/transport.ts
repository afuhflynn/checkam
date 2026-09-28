import nodemailer, { type Transporter } from "nodemailer";

// Pooled Nodemailer transport (spec 0003). One tuned transport shared by
// all mail jobs. Missing config fails loud, never silently.
let cached: Transporter | null = null;

export function mailReady(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

export function assertMailReady(): void {
  if (!mailReady()) {
    const message =
      "[mail] SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM (see .env.example).";
    if (process.env.NODE_ENV !== "production") {
      console.error(message);
    }
    throw new Error("mail_not_configured");
  }
}

export function getTransport(): Transporter {
  assertMailReady();
  if (!cached) {
    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
  }
  return cached;
}

export async function sendMail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "CheckAm <no-reply@checkam.cm>",
    ...message,
  });
}

if (process.env.NODE_ENV !== "production" && !mailReady()) {
  console.error(
    "[mail] SMTP is not configured - mail jobs will fail loud until SMTP_* is set (see .env.example).",
  );
}
