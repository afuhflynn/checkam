import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a scam — CheckAm",
  description:
    "Report fraudulent numbers, fake recruitments, or money demands. Moderated before publishing. EN/FR.",
  alternates: { canonical: "/report" },
  openGraph: { title: "Report a scam — CheckAm", type: "website" },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
