import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import "../marketing.css";

import { AuthHint } from "@/components/marketing/auth-hint";
import { ProductDemo } from "@/components/marketing/product-demo";
import { SiteFooter, SubpageHeader } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
  title: "Продуктът",
  description:
    "Пробвай Pakto: как се изпраща оферта, как пристига писмото до клиента и как той я одобрява, без регистрация.",
  alternates: { canonical: "/produkt" },
};

export default function ProductPage() {
  return (
    <>
      <AuthHint />
      <main className="marketing-page min-h-screen bg-[#f4efe4] text-[#102b38]">
        <div className="mf-grain" aria-hidden="true" />
        <SubpageHeader />
        <div className="px-[6vw] pb-[12vh] pt-14 lg:pt-20">
          <div className="mx-auto max-w-[93.75rem]">
            <p className="mf-kicker">ПРОДУКТЪТ</p>
            <h1 className="mf-section-title mt-8">
              Пробвай Pakto
              <br />
              <i>за минута.</i>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#3d5a66]">
              Избери сфера и мини през пътя на една оферта: как я пишеш, как
              пристига при клиента и какво виждаш, когато той реши. Нищо не се
              записва и не се изпраща.
            </p>
            <div className="mt-12">
              <ProductDemo />
            </div>
            <div className="mt-16">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full border border-[#102b38]/50 bg-[#ff765f] px-6 py-3.5 text-sm font-bold"
              >
                Започни безплатно <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>
    </>
  );
}
