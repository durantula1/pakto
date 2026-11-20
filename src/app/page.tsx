import type { Metadata } from "next";

import "./site.css";

import { faqQuestions } from "@/components/marketing/faq";
import { Landing } from "@/components/marketing/landing";
import { productDefinition, siteUrl } from "@/lib/seo/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Organization, product and the visible FAQ, word for word, for search and AI answer engines. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Pakto",
      url: `${siteUrl}/`,
      logo: `${siteUrl}/pakto-mark.svg`,
      address: { "@type": "PostalAddress", addressLocality: "София", addressCountry: "BG" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Pakto",
      url: `${siteUrl}/`,
      description: productDefinition,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "bg",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqQuestions.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, trusted content; `<` is escaped so the JSON cannot close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <Landing />
    </>
  );
}
