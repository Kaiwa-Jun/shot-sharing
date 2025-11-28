import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/constants/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/me/",
          "/me/edit",
          "/posts/new",
          "/settings",
          "/auth/",
          "/test",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
