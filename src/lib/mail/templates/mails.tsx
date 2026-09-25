import { render } from "@react-email/render";
import { Text } from "@react-email/components";
import { MailCta, MailCode, MailLayout } from "./layout";

export interface MailCopy {
  subject: string;
  headline: string;
  body: string;
  cta: string;
  closing: string;
}

function textTwin(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

export async function renderVerifyMail(copy: MailCopy, link: string) {
  const html = await render(
    <MailLayout preview={copy.subject} headline={copy.headline} closing={copy.closing}>
      <Text style={{ color: "#334155", fontSize: 15, margin: "0 0 8px" }}>{copy.body}</Text>
      <MailCta href={link} label={copy.cta} />
      <Text style={{ color: "#94A3B8", fontSize: 12 }}>{link}</Text>
    </MailLayout>,
  );
  return { html, text: textTwin([copy.headline, copy.body, `${copy.cta}: ${link}`, copy.closing]) };
}

export async function renderResetMail(copy: MailCopy, link: string, code: string | null) {
  const html = await render(
    <MailLayout preview={copy.subject} headline={copy.headline} closing={copy.closing}>
      <Text style={{ color: "#334155", fontSize: 15, margin: "0 0 8px" }}>{copy.body}</Text>
      <MailCta href={link} label={copy.cta} />
      {code ? <MailCode code={code} /> : null}
      <Text style={{ color: "#94A3B8", fontSize: 12 }}>{link}</Text>
    </MailLayout>,
  );
  return {
    html,
    text: textTwin([
      copy.headline,
      copy.body,
      `${copy.cta}: ${link}`,
      ...(code ? [`Code: ${code}`] : []),
      copy.closing,
    ]),
  };
}

export async function renderWelcomeMail(copy: MailCopy, link: string) {
  const html = await render(
    <MailLayout preview={copy.subject} headline={copy.headline} closing={copy.closing}>
      <Text style={{ color: "#334155", fontSize: 15, margin: "0 0 8px" }}>{copy.body}</Text>
      <MailCta href={link} label={copy.cta} />
    </MailLayout>,
  );
  return { html, text: textTwin([copy.headline, copy.body, `${copy.cta}: ${link}`, copy.closing]) };
}
