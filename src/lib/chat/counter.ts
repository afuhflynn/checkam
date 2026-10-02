import { db } from "../db";
import { doualaDayStart } from "./day";

// Tries used today by one guest key plus IP (spec 0004 AC-4): user role
// messages in guest sessions since Douala midnight, plus every answer a re ask
// superseded (spec 0014 AC-9). A re ask persists no user row, so without the
// second half a guest could replace answers forever without spending a try.
export async function guestTriesUsed(guestKey: string, ipHash: string): Promise<number> {
  return db.chatMessage.count({
    where: {
      ipHash,
      createdAt: { gte: doualaDayStart() },
      session: { guestKey, ownerId: null, deletedAt: null },
      OR: [{ role: "user" }, { role: "assistant", supersededAt: { not: null } }],
    },
  });
}
