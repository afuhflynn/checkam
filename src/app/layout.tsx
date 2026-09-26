import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import Script from "next/script";
import { Providers } from "../components/providers";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display-next",
  display: "swap",
});

const sans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans-next",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono-next",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "CheckAm — Verify before you pay | Plateforme Anti-Arnaque Cameroun",
  description:
    "Bilingual scam-verification platform for Cameroon. Verify recruitment flyers, Mobile Money transfers, civil service concours, and visa offers with hard evidence.",
  openGraph: {
    title: "CheckAm — Verify before you pay (Cameroun)",
    description:
      "Vérifiez les avis de concours, faux virements Mobile Money et faux visas avant d'envoyer votre argent.",
    url: "https://checkam.cm",
    siteName: "CheckAm",
    images: [
      {
        url: "/og-preview.png",
        width: 1200,
        height: 630,
        alt: "CheckAm Cameroon Scam Verification",
      },
    ],
    locale: "fr_CM",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`scroll-smooth ${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Pre-paint language: cookie choice wins, else browser language.
            Keeps <html lang> correct for screen readers before React hydrates.
            next/script (beforeInteractive) is the sanctioned inline-script
            path; a raw <script> tag trips Next's client render warning. */}
        <Script
          id="checkam-lang"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static pre-hydration language script, no dynamic content
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)checkam_lang=(en|fr)/);var l=m?m[1]:null;if(!l){try{l=localStorage.getItem('checkam_lang')}catch(e){l=null}}if(l!=='en'&&l!=='fr'){l=(navigator.language||'fr').toLowerCase().indexOf('en')===0?'en':'fr'}document.documentElement.lang=l;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-paper text-ink font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
