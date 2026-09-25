import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { headers } = await import("next/headers");
  const cookie = (await headers()).get("cookie") ?? "";
  const en = /(?:^|;\s*)checkam_lang=en/.test(cookie);
  return {
  title: en ? "WhatsApp bot — CheckAm" : "Bot WhatsApp — CheckAm",
  description:
    en ? "Forward suspect messages to the CheckAm WhatsApp bot and get evidence plus a forwardable warning. EN/FR." : "Transférez les messages suspects au bot WhatsApp CheckAm et recevez preuves plus alerte à transférer. FR/EN.",
  alternates: { canonical: "/whatsapp" },
  openGraph: { title: en ? "WhatsApp bot — CheckAm" : "Bot WhatsApp — CheckAm", type: "website", locale: en ? "en_US" : "fr_FR" },
};
}

export default function WhatsappLayout({ children }: { children: React.ReactNode }) {
  return children;
}
