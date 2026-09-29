import "../marketing.css";

import { AuthHint } from "@/components/marketing/auth-hint";
import { SiteFooter, SubpageHeader } from "@/components/marketing/site-chrome";

/** Terms and privacy in the site's look, so the legal texts read as part of Pakto, not of the app. */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="marketing-page min-h-screen bg-[#f4efe4] text-[#102b38]">
      <AuthHint />
      <div className="mf-grain" aria-hidden="true" />
      <SubpageHeader />
      {children}
      <SiteFooter />
    </main>
  );
}
