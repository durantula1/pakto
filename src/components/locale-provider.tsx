"use client";

import { I18nProvider } from "react-aria-components";

/** React Aria reads the browser's language by default; the product is Bulgarian whatever the browser says. */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="bg-BG">{children}</I18nProvider>;
}
