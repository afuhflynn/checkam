import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { headers } = await import("next/headers");
  const cookie = (await headers()).get("cookie") ?? "";
  const en = /(?:^|;\s*)checkam_lang=en/.test(cookie);
  return {
  title: en ? "Scam Registry — CheckAm" : "Registre des arnaques — CheckAm",
  description:
    en ? "Search confirmed scam cases, blacklisted phone numbers, and fraudulent campaigns reported across Cameroon. EN/FR." : "Cas confirmés, numéros blacklistés et campagnes frauduleuses signalés au Cameroun. FR/EN.",
  alternates: { canonical: "/directory" },
  openGraph: { title: en ? "Cameroon Scam Registry — CheckAm" : "Registre des arnaques — CheckAm", type: "website", locale: en ? "en_US" : "fr_FR" },
};
}

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
