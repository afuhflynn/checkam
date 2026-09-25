import { headers } from "next/headers";
import { auth } from "./auth";

// One gate helper for every wall (spec 0002): chat, uploads, and lookups
// ask here whether a user may proceed. Unverified password users are
// blocked; Google arrivals carry emailVerified true from creation.
export type ChatAccess =
  | { allowed: true; userId: string; email: string }
  | { allowed: false; reason: "signed-out" | "unverified"; email?: string };

export async function getChatAccess(): Promise<ChatAccess> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { allowed: false, reason: "signed-out" };
  const user = session.user as { id: string; email: string; emailVerified: boolean };
  if (!user.emailVerified) return { allowed: false, reason: "unverified", email: user.email };
  return { allowed: true, userId: user.id, email: user.email };
}
