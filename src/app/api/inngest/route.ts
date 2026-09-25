import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { sendResetMail, sendVerifyMail, sendWelcomeMail } from "../../../inngest/functions/mail";
import { processWhatsAppMessage } from "../../../inngest/functions/process-whatsapp-message";
import { purgeDeletedChats } from "../../../inngest/functions/purge-chats";
import { syncThreatFeed } from "../../../inngest/functions/sync-threat-feed";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processWhatsAppMessage,
    syncThreatFeed,
    sendVerifyMail,
    sendResetMail,
    sendWelcomeMail,
    purgeDeletedChats,
  ],
});
