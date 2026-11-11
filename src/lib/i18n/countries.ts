/** Defaults per country for a new company. Only Bulgaria has a translated interface for now; the rest is a base for later. */
export const COUNTRIES = {
  BG: { name: "България", currency: "EUR", locale: "bg-BG", timezone: "Europe/Sofia", vatRate: 20, vatLabel: "ДДС" },
  RO: { name: "Румъния", currency: "RON", locale: "ro-RO", timezone: "Europe/Bucharest", vatRate: 21, vatLabel: "TVA" },
  GR: { name: "Гърция", currency: "EUR", locale: "el-GR", timezone: "Europe/Athens", vatRate: 24, vatLabel: "ΦΠΑ" },
} as const;

export type CountryCode = keyof typeof COUNTRIES;

export function countryDefaults(code: string | null | undefined) {
  return COUNTRIES[(code ?? "BG").toUpperCase() as CountryCode] ?? COUNTRIES.BG;
}
