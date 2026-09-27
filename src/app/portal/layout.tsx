import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вашите обекти",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
