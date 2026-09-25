"use client";

import {
  ArrowRight,
  Bot,
  CheckCheck,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  PhoneCall,
  QrCode,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { GuideTrials } from "../../components/guide-trials";
import { useTranslation } from "../../lib/i18n/context";

const MINSEC_REPLY_FR = `🚨 *ALERTE ARNAQUE / CHECKAM CAMEROUN* 🚨

Ne vous faites pas avoir ! Ce message a été vérifié sur https://checkam.cm :

🔹 *1.* Utilise une adresse email gratuite non officielle (minesec.recrutement2025@gmail.com) au lieu d'un domaine gouvernemental (*.gov.cm).
🔹 *2.* Exige le paiement de 25 000 FCFA par Orange Money au lieu d'une quittance officielle du Trésor Public.
🔹 *3.* Les recrutements du MINESEC sont signés par arrêté ministériel et publiés sur CRTV, jamais sur les réseaux sociaux.

📞 *Numéro(s) concerné(s) :* +237 699 12 34 56
🛡️ *Signalez gratuitement à l'ANTIC au 8202.*
🔄 *Faites suivre dans vos groupes WhatsApp pour protéger vos proches !*`;

const MINSEC_REPLY_EN = `🚨 *SCAM ALERT / CHECKAM CAMEROON* 🚨

Verify before you pay! This notice was analyzed on https://checkam.cm :

🔹 *1.* Uses an unofficial free email address (minesec.recrutement2025@gmail.com) instead of a government domain (*.gov.cm).
🔹 *2.* Demands 25,000 FCFA via Orange Money instead of an official Public Treasury receipt.
🔹 *3.* MINESEC recruitments are signed by ministerial decree and broadcast on CRTV, never on social media.

📞 *Flagged Contact(s):* +237 699 12 34 56
🛡️ *Report free to ANTIC hotline 8202.*
🔄 *Forward to your WhatsApp family groups to protect others!*`;

const MOMO_REPLY_FR = `🚨 *ALERTE ARNAQUE / CHECKAM CAMEROUN* 🚨

Ne vous faites pas avoir ! Ce message a été vérifié sur https://checkam.cm :

🔹 *1.* Arnaque classique au faux transfert Mobile Money : L'escroc envoie un faux SMS prétendant un versement par erreur pour vous pousser à renvoyer des fonds inexistants.
🔹 *2.* Ne composez jamais votre code PIN secret suite à un appel inconnu.
🔹 *3.* Vérifiez votre solde réel via le menu officiel (#150# ou *126#).

📞 *Numéro(s) concerné(s) :* +237 698 00 11 22
🛡️ *Signalez gratuitement à l'ANTIC au 8202.*
🔄 *Faites suivre dans vos groupes WhatsApp pour protéger vos proches !*`;

const MOMO_REPLY_EN = `🚨 *SCAM ALERT / CHECKAM CAMEROON* 🚨

Verify before you pay! This notice was analyzed on https://checkam.cm :

🔹 *1.* Classic fake Mobile Money transfer scam: the fraudster sends a fake SMS claiming a mistaken payment to push you to return funds that never existed.
🔹 *2.* Never enter your secret PIN after an unknown call.
🔹 *3.* Check your real balance via the official menu (#150# or *126#).

📞 *Flagged Contact(s):* +237 698 00 11 22
🛡️ *Report free to ANTIC hotline 8202.*
🔄 *Forward to your WhatsApp family groups to protect others!*`;

export default function WhatsAppPage() {
  const { language, t } = useTranslation();
  const [activeSimulatorDemo, setActiveSimulatorDemo] = useState<"minesec" | "momo">("minesec");

  const simReply =
    activeSimulatorDemo === "minesec"
      ? language === "fr"
        ? MINSEC_REPLY_FR
        : MINSEC_REPLY_EN
      : language === "fr"
        ? MOMO_REPLY_FR
        : MOMO_REPLY_EN;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-800">
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
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
      </div>

      {/* Interactive WhatsApp Phone Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Explanatory Features */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Zap className="h-5 w-5" />
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
            <div className="h-10 w-10 rounded-xl bg-authority-100 text-authority-900 flex items-center justify-center font-bold">
              <Bot className="h-5 w-5" />
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
            <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl font-black text-authority-950">
              {language === "fr"
                ? "3. Alerte Prête à Rediffuser"
                : "3. Ready-to-Forward Group Alert"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === "fr"
                ? "Recevez une alerte formatée avec émoticônes pour avertir immédiatement votre famille et vos groupes d'amis."
                : "Receive a formatted alert message complete with warning emojis to immediately caution your community."}
            </p>
          </div>
        </div>

        {/* Right: Phone Mockup UI */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-sm rounded-[2.5rem] border-8 border-slate-900 bg-slate-900 shadow-2xl overflow-hidden">
            {/* Phone Header */}
            <div className="bg-[#075E54] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-white text-authority-950 flex items-center justify-center font-black text-xs">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight flex items-center gap-1">
                    CheckAm Cameroun
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
                    {activeSimulatorDemo === "minesec"
                      ? "Avis de recrutement des 325 instituteurs au MINESEC. Envoyez 25 000 FCFA par Orange Money au 699123456. Email: minesec.recrutement2025@gmail.com"
                      : "Vous avez reçu 75.000 FCFA de NKODO PIERRE (698001122). Erreur de transfert, veuillez renvoyer."}
                  </p>
                  <div className="text-[9px] text-slate-500 text-right flex items-center justify-end gap-1">
                    <span>10:42</span>
                    <CheckCheck className="h-3 w-3 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Bot response */}
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[92%] space-y-2 border border-slate-200/80">
                  <div className="font-mono text-[10.5px] whitespace-pre-line text-slate-800 leading-relaxed select-none">
                    {simReply}
                  </div>
                  <div className="text-[9px] text-slate-400 text-right">10:42</div>
                </div>
              </div>
            </div>

            {/* Simulator Switcher Controls */}
            <div className="bg-white p-2.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700">{t.waTestScenario}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveSimulatorDemo("minesec")}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    activeSimulatorDemo === "minesec"
                      ? "bg-authority-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  MINESEC
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSimulatorDemo("momo")}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    activeSimulatorDemo === "momo"
                      ? "bg-authority-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Orange Money
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save number + trials */}
      <GuideTrials />

      {/* Webhook Developer Info Card */}
      <Card className="border border-slate-200 bg-authority-50/50 p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-authority-950 font-bold text-lg">
            <Bot className="h-5 w-5 text-authority-700" />
            <span>{t.waDevSpecTitle}</span>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            /api/public/whatsapp/webhook
          </Badge>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{t.waDevSpecDesc}</p>
      </Card>
    </div>
  );
}
