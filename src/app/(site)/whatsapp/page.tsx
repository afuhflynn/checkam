import { type DemoReplies, WhatsAppGuideBody } from "../../../components/whatsapp/guide-body";
import { type BenignKind, classifyBenignChat, renderBenignReply } from "../../../lib/chat/benign";
import { runRulesEngine } from "../../../lib/rules/engine";

/**
 * The two scam shapes the guide demonstrates. The text here is the engine's
 * input, so the bubble a visitor reads and the reply they see below it are the
 * same pair the bot would really produce.
 */
const SCENARIOS = {
  minesec: {
    label: "MINESEC",
    text: "Avis de recrutement des 325 instituteurs au MINESEC. Envoyez 25 000 FCFA par Orange Money au 699123456. Email: minesec.recrutement2025@gmail.com",
  },
  momo: {
    label: "Orange Money",
    text: "Vous avez reçu 75.000 FCFA de NKODO PIERRE (698001122). Erreur de transfert, veuillez renvoyer.",
  },
  hello: {
    label: "Bonjour",
    text: "Hello, how does it work?",
  },
} as const;

/**
 * Guide truth (scope row 28, spec 0016 AC-12): the simulator renders the same
 * `whatsappReply` field the worker sends, so the guide can no longer advertise a
 * reply shape the product forbids.
 *
 * This runs on the server because the rules engine is the real source and the
 * guide has no business carrying a second copy of it. Both languages are
 * rendered up front because the visitor's language is client state, chosen after
 * this page is sent.
 */
function renderReplies(): DemoReplies {
  return Object.fromEntries(
    Object.entries(SCENARIOS).map(([key, scenario]) => {
      // Calm truth (spec 0019): a benign demo renders the same fixed copy the
      // worker sends, never a verdict, so the guide matches the bot exactly.
      const benign = classifyBenignChat(scenario.text) as BenignKind;
      if (benign !== "check") {
        return [
          key,
          {
            fr: renderBenignReply(benign, "fr"),
            en: renderBenignReply(benign, "en"),
          },
        ];
      }
      const { whatsappReply } = runRulesEngine({ text: scenario.text });
      return [key, { fr: whatsappReply.fr, en: whatsappReply.en }];
    }),
  ) as DemoReplies;
}

export default function WhatsAppPage() {
  return <WhatsAppGuideBody replies={renderReplies()} scenarios={SCENARIOS} />;
}
