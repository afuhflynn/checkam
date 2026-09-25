import { db } from "../db";
import { doualaDayStart } from "./day";

// Tries used today by one guest key plus IP (spec 0004 AC-4): user role
// messages in guest sessions since Douala midnight.
export async function guestTriesUsed(guestKey: string, ipHash: string): Promise<number> {
  return db.chatMessage.count({
    where: {
      role: "user",
      ipHash,
      createdAt: { gte: doualaDayStart() },
      session: { guestKey, ownerId: null, deletedAt: null },
    },
  });
}
