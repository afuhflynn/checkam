import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

export function MailLayout({
  preview,
  headline,
  children,
  closing,
}: {
  preview: string;
  headline: string;
  children: ReactNode;
  closing: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#F6F2E9", fontFamily: "sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
          <Section
            style={{
              backgroundColor: "#0B192C",
              borderRadius: "12px 12px 0 0",
              padding: "20px 24px",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 800, margin: 0 }}>
              CheckAm
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 12, margin: "4px 0 0" }}>
              Verify before you pay · Vérifiez avant de payer
            </Text>
          </Section>
          <Section
            style={{ backgroundColor: "#FFFFFF", borderRadius: "0 0 12px 12px", padding: "24px" }}
          >
            <Text style={{ color: "#101828", fontSize: 22, fontWeight: 800, margin: "0 0 12px" }}>
              {headline}
            </Text>
            {children}
            <Text style={{ color: "#64748B", fontSize: 12, margin: "24px 0 0" }}>{closing}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function MailCta({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ margin: "20px 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: "#0B192C",
          borderRadius: 8,
          color: "#FFFFFF",
          display: "inline-block",
          fontSize: 15,
          fontWeight: 700,
          padding: "12px 24px",
          textDecoration: "none",
        }}
      >
        {label}
      </Button>
    </Section>
  );
}

export function MailCode({ code }: { code: string }) {
  return (
    <Section
      style={{
        backgroundColor: "#F6F2E9",
        borderRadius: 8,
        margin: "20px 0",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <Text
        style={{
          color: "#0B192C",
          fontFamily: "monospace",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 6,
          margin: 0,
        }}
      >
        {code}
      </Text>
    </Section>
  );
}
