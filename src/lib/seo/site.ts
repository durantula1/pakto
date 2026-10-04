/** Public origin for absolute URLs in robots, sitemap and structured data. */
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** The one-sentence product definition: the meta description and the landing page say the same thing. */
export const productDefinition =
  "Pakto записва всяка оферта и допълнителна промяна с цена и срок: пращаш линк, а клиентът ги одобрява от телефона с код от имейла си, без регистрация, преди да започнеш работа. Така няма спор какво е договорено.";
