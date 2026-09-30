import { redirect } from "next/navigation";

/**
 * Settings is a dialog over the chat thread now, not a page of its own. This
 * route stays as the cross surface deep link so the landing header, any
 * bookmark and any shared link still reach it, and answers with a server
 * redirect to the one canonical place the dialog lives.
 *
 * It is a server component precisely so this is a real redirect: a link
 * preview, a crawler and a client with no JavaScript all land on the chat
 * route instead of a blank frame.
 */
export default function SettingsPage() {
  redirect("/chat?panel=settings");
}
