"use client";

import { Bot, CheckCheck, MessageCircle, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../../lib/i18n/context";
import { CLICK_TO_CHAT_ANCHOR_ID } from "../../lib/whatsapp/click-to-chat";
import { WhatsAppChatButton } from "./chat-button";

/** The two scenarios the guide demonstrates, keyed by the switcher. */
export type DemoScenario = "minesec" | "momo";

/**
 * One rendered reply per scenario per language, produced by the rules engine on
 * the server. The guide shows exactly what the bot sends, so the hardcoded
 * sample replies that used to live here are gone (spec 0016, AC-12).
 */
export type DemoReplies = Record<DemoScenario, { fr: string; en: string }>;

/**
 * The reply as WhatsApp draws it.
 *
 * WhatsApp turns a line wrapped in single asterisks into bold, and the reply
 * uses that in exactly one place, its header. Mirroring only that rule keeps the
 * simulator honest without turning it into a second Markdown implementation
 * that could disagree with WhatsApp, which is the drift this page exists to
 * remove. Everything else, bullets included, is already the character it will
 * be on the phone.
 */
function WhatsAppReply({ body }: { body: string }) {
  const [first, ...rest] = body.split("\n");
  const header = first && /^\*(.+)\*$/.exec(first);

  return (
    <>
      <span className="font-bold">{header ? header[1] : (first ?? "")}</span>
      {rest.length > 0 && `\n${rest.join("\n")}`}
    </>
  );
}

export function WhatsAppGuideBody({
  replies,
  scenarios,
}: {
  replies: DemoReplies;
  scenarios: Record<DemoScenario, { label: string; text: string }>;
}) {
  const { language, t } = useTranslation();
  const [activeSimulatorDemo, setActiveSimulatorDemo] = useState<DemoScenario>("minesec");

  const simReply = replies[activeSimulatorDemo][language];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-800">
          <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden="true" />
          <span>
            {language === "fr" ? "Canal WhatsApp Officiel CheckAm" : "CheckAm WhatsApp Channel"}
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-black text-authority-950 tracking-tight">
          {language === "fr"
            ? "Vérifiez Directement Dans Vos Discussions WhatsApp"
            : "Verify Directly in Your WhatsApp Chats"}
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {language === "fr"
            ? "Transférez simplement un message suspect, une photo de flyer ou un SMS reçu au bot CheckAm. Il analyse et vous répond en quelques secondes avec les preuves et l'alerte à transférer."
            : "Forward any suspicious notice, flyer screenshot, or SMS to the CheckAm WhatsApp bot. It analyzes in seconds and replies with concrete receipts and a shareable warning."}
        </p>

        {/*
          The page's primary action is starting the conversation, so the chat
          button comes before the explanation and the simulator (AC-4).
        */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <WhatsAppChatButton id={CLICK_TO_CHAT_ANCHOR_ID} />
          <p className="text-xs text-slate-500 max-w-sm text-center">
            {language === "fr"
              ? "Ouvrez WhatsApp, collez le message suspect, et CheckAm répond en quelques secondes."
              : "Open WhatsApp, paste the suspicious message, and CheckAm replies in seconds."}
          </p>
        </div>
      </div>

      {/* Interactive WhatsApp Phone Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Explanatory Features */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-black text-authority-950">
              {language === "fr"
                ? "1. Transférez le message suspect"
                : "1. Forward the suspicious message"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === "fr"
                ? "Dès que vous recevez une annonce douteuse (recrutement, faux virement MoMo, visa express), faites 'Transférer' vers CheckAm."
                : "Whenever you receive a questionable notice or SMS, forward it straight to the CheckAm WhatsApp bot."}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-authority-100 text-authority-900 flex items-center justify-center">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-black text-authority-950">
              {language === "fr"
                ? "2. Moteur IA + Règles Officielles"
                : "2. AI OCR + Deterministic Rules"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === "fr"
                ? "Le bot lit le texte et les images, extrait les montants et numéros, et confronte le message aux registres de l'État camerounais."
                : "The bot extracts phone numbers, amounts, and emails from images or text and checks against government regulations."}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-black text-authority-950">
              {language === "fr"
                ? "3. Alerte Prête à Rediffuser"
                : "3. Ready-to-Forward Group Alert"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === "fr"
                ? "Recevez une alerte formatée pour votre téléphone, avec les preuves et le numéro vert ANTIC, à transférer à vos proches."
                : "Receive an alert formatted for your phone, with the evidence and the ANTIC hotline, ready to forward to your family."}
            </p>
          </div>
        </div>

        {/* Right: Phone Mockup UI */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-sm rounded-[2.5rem] border-8 border-slate-900 bg-slate-900 shadow-2xl overflow-hidden">
            {/* Phone Header */}
            <div className="bg-[#075E54] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-white text-authority-950 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight flex items-center gap-1">
                    CheckAm Cameroun
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  </div>
                  <div className="text-[10px] text-emerald-200 leading-none">{t.waBotName}</div>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="bg-[#ECE5DD] p-3 space-y-3 min-h-[420px] text-xs font-sans overflow-y-auto">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-[#DCF8C6] p-2.5 rounded-lg rounded-tr-none shadow-sm max-w-[85%] space-y-1">
                  <p className="text-[11px] text-slate-800">
                    {scenarios[activeSimulatorDemo].text}
                  </p>
                  <div className="text-[9px] text-slate-500 text-right flex items-center justify-end gap-1">
                    <span>10:42</span>
                    <CheckCheck className="h-3 w-3 text-blue-500" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/*
                The real reply, rendered by the rules engine on the server. It is
                shown exactly as it arrives in the chat, with the one piece of
                WhatsApp markup drawn the way WhatsApp draws it.
              */}
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[92%] space-y-2 border border-slate-200/80">
                  <div className="font-mono text-[10.5px] whitespace-pre-line text-slate-800 leading-relaxed select-none">
                    <WhatsAppReply body={simReply} />
                  </div>
                  <div className="text-[9px] text-slate-400 text-right">10:42</div>
                </div>
              </div>
            </div>

            {/*
              Simulator Switcher Controls. A fieldset and legend, so the group is
              named for assistive technology without an ARIA role override, and
              each button reports whether it is the one currently shown.
            */}
            <div className="bg-white p-2.5 border-t border-slate-200 flex items-center justify-between gap-2 text-[11px]">
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="mb-1 font-bold text-slate-700">{t.waTestScenario}</legend>
                <div className="flex gap-1.5">
                  {(Object.keys(scenarios) as DemoScenario[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveSimulatorDemo(key)}
                      aria-pressed={activeSimulatorDemo === key}
                      className={`px-2 py-1.5 rounded text-[10px] font-bold transition-colors ${
                        activeSimulatorDemo === key
                          ? "bg-authority-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {scenarios[key].label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
