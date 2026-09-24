import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { processWhatsAppMessage } from "../../../inngest/functions/process-whatsapp-message";
import { syncThreatFeed } from "../../../inngest/functions/sync-threat-feed";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processWhatsAppMessage, syncThreatFeed],
});
