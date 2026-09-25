import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scam Registry — CheckAm",
  description:
    "Search confirmed scam cases, blacklisted phone numbers, and fraudulent campaigns reported across Cameroon. EN/FR.",
  alternates: { canonical: "/directory" },
  openGraph: { title: "Cameroon Scam Registry — CheckAm", type: "website" },
};

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
