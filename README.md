# Pakto

Mobile-first пилот за договорени оферти, промени, срокове, етапи и плащания
по строителни и ремонтни обекти.

Основният поток е: обект → чернова → замразена версия → защитен линк →
одобрение, искане за промяна или отказ. Клиентът няма акаунт;
bootstrap линкът създава отделна HttpOnly portal session.

## Стек

- Next.js 16.3.5, React 19.2 и TypeScript 5.9;
- Tailwind CSS 4 и shadcn с React Aria primitives;
- PostgreSQL 17, Drizzle ORM и `postgres.js` (само от сървъра), миграции с dbmate;
- Better Auth за служителите, файлове на диска на сървъра, имейли през SMTP;
- Docker Compose на Hostinger VPS: Caddy, приложението, Postgres, cron, бекъпи (виж `docs/deployment-notes.md`).

## Локално стартиране

Изисква Node 24.19+ и pnpm 11.21.

1. Копирай `.env.example` като `.env.local` и попълни `PORTAL_LINK_SECRET` и `CRON_SECRET`.
2. `pnpm db:up` (Postgres и Mailpit в Docker), после `pnpm db:migrate`.
3. По желание `pnpm db:pull` за анонимизирано копие на базата от сървъра.
4. Стартирай `pnpm dev`. Писмата се виждат в Mailpit: http://localhost:8025.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

## Сигурност

- raw bootstrap и session tokens никога не се записват — пази се SHA-256 hash;
- portal cookie е HttpOnly, Secure в production и SameSite=Lax; клиентският PDF маршрут проверява същата сесия;
- portal страниците са `private, no-store`, `no-referrer` и не са frame-able;
- browser-ът никога не чете базата директно: всичко минава през сървъра;
- изпратената версия пази canonical content hash и съдържанието ѝ е защитено
  от database trigger;
- решенията и timeline events са append-only и idempotent.

Пилотът не издава фактури. Старите passport маршрути (от предишния продукт MadeFlow) са достъпни
само за owner, докато бъдат премахнати след пилота. Подробните стъпки за
приемане са в `docs/implementation-plan.md`.
