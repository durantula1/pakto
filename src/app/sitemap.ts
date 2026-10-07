import type { MetadataRoute } from "next";

import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { siteUrl } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/sign-up`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.4 },
    // A legal document's version is the date its text last changed.
    { url: `${siteUrl}/terms`, lastModified: LEGAL_DOCUMENTS.terms.version, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: LEGAL_DOCUMENTS.privacy.version, changeFrequency: "yearly", priority: 0.3 },
  ];
}
