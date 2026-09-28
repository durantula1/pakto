/** Public origin for absolute URLs in robots, sitemap and structured data. */
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** The one-sentence product definition: the meta description and the landing page say the same thing. */
export const productDefinition =
  "Pakto е за фирми, които работят с клиенти и държат на сроковете: пращаш оферти и допълнителни промени с линк, а клиентът ги одобрява от телефона с код от имейла си, без регистрация.";
