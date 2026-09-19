import type { MetadataRoute } from "next";

// ponytail: nothing public is meant to be indexed; apply links carry tokens
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
