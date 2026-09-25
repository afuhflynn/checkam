import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/chat`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/directory`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/report`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/whatsapp`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
