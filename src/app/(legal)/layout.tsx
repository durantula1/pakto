import "../site.css";

import { AuthHint } from "@/components/marketing/auth-hint";
import { SiteFooter, SubpageHeader } from "@/components/marketing/site-chrome";

/** Terms and privacy in the site's look, so the legal texts read as part of Pakto, not of the app. */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="ys">
      <AuthHint />
      <SubpageHeader />
      {children}
      <SiteFooter />
    </main>
  );
}
