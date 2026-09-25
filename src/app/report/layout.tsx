import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { headers } = await import("next/headers");
  const cookie = (await headers()).get("cookie") ?? "";
  const en = /(?:^|;\s*)checkam_lang=en/.test(cookie);
  return {
  title: en ? "Report a scam — CheckAm" : "Signaler une arnaque — CheckAm",
  description:
    en ? "Report fraudulent numbers, fake recruitments, or money demands. Moderated before publishing. EN/FR." : "Signalez numéros frauduleux, faux recrutements ou demandes d’argent. Modéré avant publication. FR/EN.",
  alternates: { canonical: "/report" },
  openGraph: { title: en ? "Report a scam — CheckAm" : "Signaler une arnaque — CheckAm", type: "website", locale: en ? "en_US" : "fr_FR" },
};
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
