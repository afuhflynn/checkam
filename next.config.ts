import type { NextConfig } from "next";

// Next blocks cross origin access to dev resources, so the ngrok host that
// exposes this server must be listed here. ngrok free rotates the subdomain on
// every restart, so the host lives in NGROK_DOMAIN instead of a literal: set
// it to the current tunnel host (no scheme, no path), restart `pnpm dev`, and
// point the Meta webhook at the same host. The literal below is only the
// fallback when the variable is unset.
const ngrokDomain = (process.env.NGROK_DOMAIN ?? "")
  .trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@arcjet/next"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // allowedDevOrigins: [
  //   ngrokDomain || "ester-unpollarded-divisibly.ngrok-free.dev",
  // ],
};

export default nextConfig;
