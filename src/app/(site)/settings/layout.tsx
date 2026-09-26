import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { headers } = await import("next/headers");
  const cookie = (await headers()).get("cookie") ?? "";
  const en = /(?:^|;\s*)checkam_lang=en/.test(cookie);
  return {
  title: en ? "Settings — CheckAm" : "Paramètres — CheckAm",
  description: "Profile, language, and password for your CheckAm account.",
  alternates: { canonical: "/settings" },
  robots: { index: false, follow: false },
};
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
