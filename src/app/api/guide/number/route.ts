import { NextResponse } from "next/server";

// Guide number (spec 0007 AC-5): display E.164 plus wa.me link from env,
// with a printed fallback to web chat when unset.
export async function GET() {
  const raw = (process.env.WHATSAPP_NUMBER ?? "").replace(/[^0-9]/g, "");
  if (!raw) {
    return NextResponse.json({ display: null, waLink: null, fallback: true });
  }
  const display = `+${raw}`;
  return NextResponse.json({
    display,
    waLink: `https://wa.me/${raw}`,
    fallback: false,
  });
}
