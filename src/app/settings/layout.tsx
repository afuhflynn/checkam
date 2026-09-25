import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — CheckAm",
  description: "Profile, language, and password for your CheckAm account.",
  alternates: { canonical: "/settings" },
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
