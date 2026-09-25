import { inngest } from "../client";
import { db } from "../../lib/db";
import { deleteStoredFiles } from "../../lib/storage";

// Daily purge (spec 0004 AC-9): rows soft deleted over 30 days ago go away
// for good, with stored attachments collected first.
export const purgeDeletedChats = inngest.createFunction(
  {
    id: "purge-deleted-chats",
    name: "Purge deleted chats",
    retries: 0,
    triggers: [{ cron: "0 2 * * *", timezone: "Africa/Douala" }],
  },
  async ({ step }) => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const staleSessions = await step.run("find-stale", () =>
      db.chatSession.findMany({
        where: { deletedAt: { lt: cutoff } },
        select: { id: true },
      }),
    );
    const staleFolders = await step.run("find-stale-folders", () =>
      db.chatFolder.findMany({
        where: { deletedAt: { lt: cutoff } },
        select: { id: true },
      }),
    );

    const keys = await step.run("collect-keys", async () => {
      const rows = await db.chatMessage.findMany({
        where: { sessionId: { in: staleSessions.map((s) => s.id) } },
        select: { attachments: true },
      });
      const out: string[] = [];
      for (const row of rows) {
        const list = row.attachments as { key?: string }[] | null;
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item?.key) out.push(item.key);
          }
        }
      }
      return out;
    });

    await step.run("delete-files", () => deleteStoredFiles(keys));
    const removed = await step.run("delete-rows", () =>
      db.$transaction([
        db.chatMessage.deleteMany({ where: { sessionId: { in: staleSessions.map((s) => s.id) } } }),
        db.chatSession.deleteMany({ where: { id: { in: staleSessions.map((s) => s.id) } } }),
        db.chatFolder.deleteMany({ where: { id: { in: staleFolders.map((s) => s.id) } } }),
      ]),
    );
    return { purgedSessions: removed[1].count, purgedFolders: removed[2].count };
  },
);
