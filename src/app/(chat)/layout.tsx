import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat - CheckAm",
  description: "Verify suspect messages with evidence, in English or French.",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
