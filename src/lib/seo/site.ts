/** Public origin for absolute URLs in robots, sitemap and structured data. */
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** The one-sentence product definition: the meta description and the landing page say the same thing. */
export const productDefinition =
  "Pakto записва всяка оферта и допълнителна промяна с цена и срок. Клиентът ги одобрява от телефона си с еднократен код от имейла, без регистрация, преди работата да започне. Така договореното е ясно и за двете страни.";
