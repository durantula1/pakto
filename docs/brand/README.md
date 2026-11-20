# Pakto brand: logo

Shapes decided on 06.10.2026; recoloured for the "Ясно" design on 20.11.2026. The files here are the final versions. In the app: `public/pakto-logo.svg` / `pakto-logo-dark.svg` (wordmark, used by `Wordmark` and the marketing nav/footer), `public/pakto-mark.svg` and `public/icon.svg` (icon, favicon, PWA), `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, and the email logo PNG in `src/lib/email/logo.ts`.

## Wordmark

- "pakt" in **Nunito Black (900)**, slight negative tracking (-0.02em).
- The **"o" is a chat bubble with a tick**: blue `#1d36ff` bubble, tail bottom-left, white tick. It stands for the client answering in the portal and approving the offer.
- Text is outlined to paths, so the SVGs do not need the font.
- `pakto-logo.svg`: ink `#0b0b0b` text, for light backgrounds (paper `#f1f0eb` or white).
- `pakto-logo-dark.svg`: paper text, for ink backgrounds.
- `pakto-logo-mono.svg`: one colour (ink), for PDFs and print.

## App icon

- `pakto-icon.svg`: ink rounded square, paper "p" stem, the bowl of the "p" is a blue circle with a white tick.
- Rendered: `pakto-icon-512.png`, `pakto-icon-192.png` (PWA manifest), `apple-touch-icon.png` (180 px), `favicon-32.png`.
- Checked down to 16 px.

## Palette

The "Ясно" tokens in `src/app/globals.css`: paper `#f1f0eb`, ink `#0b0b0b`, blue `#1d36ff`, approved `#0e8a4a`, change requested `#a45a00`, late `#c2371f`, grey text `#6d6d68`.
