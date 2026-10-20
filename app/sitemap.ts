import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/features",
    "/pricing",
    "/api-setup",
    "/embedded-signup",
    "/contact",
    "/faq",
    "/terms",
    "/privacy",
  ];

  return routes.map((r) => ({
    url: `${site.domain}${r}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: r === "" ? 1 : 0.7,
  }));
}
