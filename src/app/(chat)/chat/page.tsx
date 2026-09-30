import { headers } from "next/headers";
import { ChatShell } from "../../../components/chat/chat-shell";

export const metadata = {
  title: "Chat - CheckAm",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookie = (await headers()).get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)checkam_lang=(en|fr)/);
  const params = await searchParams;
  const q = params?.q;
  const trial =
    typeof q === "string" && q.trim() ? q.trim().slice(0, 500) : null;
  const s = params?.s;
  const deepLinkId = typeof s === "string" && /^[a-z0-9]+$/i.test(s) ? s : null;
  return (
    <ChatShell
      locale={match?.[1] === "en" ? "en" : "fr"}
      trial={trial}
      deepLinkId={deepLinkId}
    />
  );
}
