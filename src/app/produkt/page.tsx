import type { Metadata } from "next";

import "../marketing.css";

import { AuthHint } from "@/components/marketing/auth-hint";
import { ProductExperience } from "@/components/marketing/product-experience";

export const metadata: Metadata = {
  title: "Продуктът",
  description:
    "Виж Pakto в действие: оферта в админа, писмото до клиента, одобрение от телефона, проследяване на проекти, екип и финанси.",
  alternates: { canonical: "/produkt" },
};

export default function ProductPage() {
  return (
    <>
      <AuthHint />
      <ProductExperience />
    </>
  );
}
