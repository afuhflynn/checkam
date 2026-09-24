import arcjet, { detectBot, fixedWindow, shield, tokenBucket } from "@arcjet/next";

// CheckAm Arcjet Security Configuration
export const aj = arcjet({
  key: process.env.ARCJET_KEY || "ajkey_placeholder",
  rules: [
    // 1. Shield against SQLi, XSS, and known exploit patterns
    shield({
      mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
    }),
    // 2. Detect malicious automated bots & scrapers (allowing friendly search engine crawlers)
    detectBot({
      mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),
    // 3. Token bucket rate limit for public verification checks (30 checks per minute per IP)
    tokenBucket({
      mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
      refillRate: 5,
      interval: 10,
      capacity: 30,
    }),
  ],
});

// Stricter rate limit for scam report submissions (5 submissions per hour per IP)
export const reportLimiter = arcjet({
  key: process.env.ARCJET_KEY || "ajkey_placeholder",
  rules: [
    fixedWindow({
      mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
      window: "1h",
      max: 5,
    }),
  ],
});
