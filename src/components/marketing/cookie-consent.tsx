"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  loadGoogleTag,
  openConsentSettings,
  readConsent,
  saveConsent,
  type Consent,
} from "@/lib/analytics/google-ads";

/** Signed-in workspace, the client's portal and the routes behind them: no banner and no Google tag. */
const PRIVATE_PATH = /^\/(app|portal|access|api|welcome)(\/|$)/;

/**
 * The cookie banner of the public pages, and the switch for the Google tag. It shows on the first
 * visit and again from the „Бисквитки“ link in the footer; the choice is kept in localStorage.
 * „Приемам“ and „Отказ“ look the same on purpose: refusing must be as easy as accepting.
 */
export function CookieConsent() {
  const pathname = usePathname();
  const isPrivate = PRIVATE_PATH.test(pathname);
  // undefined until mounted, so the server render and the first client render agree.
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const sync = () => setConsent(readConsent());
    const reopen = () => setReopened(true);
    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
    };
  }, []);

  useEffect(() => {
    if (consent === "granted" && !isPrivate) loadGoogleTag();
  }, [consent, isPrivate]);

  if (isPrivate || consent === undefined || (consent !== null && !reopened)) return null;

  const choose = (value: Consent) => {
    saveConsent(value);
    setReopened(false);
  };

  return (
    <div
      role="region"
      aria-label="Бисквитки"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[70] rounded-2xl border border-[#102b38]/15 bg-[#fbf7ec] p-4 text-[#102b38] shadow-xl shadow-[#102b38]/15 sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-[28rem] sm:-translate-x-1/2"
    >
      <p className="text-sm leading-6">
        Използваме бисквитки за анализ и реклама.{" "}
        <Link href="/privacy#cookies" className="font-semibold underline underline-offset-4 hover:text-[#c2412d]">
          Научи повече
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(
          [
            ["granted", "Приемам"],
            ["denied", "Отказ"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            className="h-10 rounded-xl border border-[#102b38] bg-[#102b38] px-4 text-sm font-semibold text-[#fbf7ec] transition-colors hover:bg-[#1d4152] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff765f]/50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The footer's „Бисквитки“ link: opens the banner again. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      Бисквитки
    </button>
  );
}
