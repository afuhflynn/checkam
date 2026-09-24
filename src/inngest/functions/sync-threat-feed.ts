import { db } from "../../lib/db";
import { inngest } from "../client";

export const syncThreatFeed = inngest.createFunction(
  {
    id: "sync-threat-feed-cache",
    name: "Sync Public Threat Feed Cache",
    triggers: [{ event: "threat-feed/sync.requested" }],
  },
  async ({
    step,
  }: {
    step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> };
  }) => {
    const totalActive = await step.run("count-flagged-identifiers", async () => {
      return await db.flaggedIdentifier.count({
        where: { isActive: true },
      });
    });

    return {
      success: true,
      activeThreatsCount: totalActive,
      syncedAt: new Date().toISOString(),
    };
  },
);
