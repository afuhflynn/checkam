import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WhatsApp bot — CheckAm",
  description:
    "Forward suspect messages to the CheckAm WhatsApp bot and get evidence plus a forwardable warning. EN/FR.",
  alternates: { canonical: "/whatsapp" },
  openGraph: { title: "WhatsApp bot — CheckAm", type: "website" },
};

export default function WhatsappLayout({ children }: { children: React.ReactNode }) {
  return children;
}
