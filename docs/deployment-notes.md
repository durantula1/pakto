# Бележки за пускане на сървъра (Hostinger VPS)

Приложението няма да е на Vercel, а на собствен VPS в Hostinger. Тук записваме **всичко, което трябва да се настрои**, за да не се забрави при миграцията. Файлът се допълва при всяка нова функция.

> Статус: още не е мигрирано. Засега работи локално, с базата в Supabase (проектът все още се казва `MadeFlow`, ref `mzmvtxjmdqucrfuajimd`, регион eu-central-1).

---

## 1. Променливи на средата (`.env` на сървъра)

Задават се в `.env.production` или в systemd/PM2 конфигурацията. **Никога в git.**

| Променлива | Задължителна | Какво е | Бележки |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | да | Публичният адрес, напр. `https://pakto.net` | Влиза в линковете към клиента, в имейлите, в auth пренасочванията и в SEO адресите (`robots.txt`, `sitemap.xml`, canonical, JSON-LD). Ако лендингът и приложението са на различни домейни, SEO адресите трябва да сочат към лендинга. **Задава се при build**, защото е `NEXT_PUBLIC_`. |
| `DATABASE_URL` | да | Postgres connection string (pooler, transaction mode) | Сървърният код чете и пише само оттук. |
| `DATABASE_MIGRATION_URL` | не | Direct connection (session mode) за миграции | Нужен само ако миграциите се пускат от сървъра. |
| `DATABASE_SSL` | не | `true` (по подразбиране) | `false` за Postgres контейнера на нашия сървър (вътрешна Docker мрежа без TLS). Supabase иска `true`. Live известията слушат през `DATABASE_MIGRATION_URL` (ако има), защото `LISTEN` не минава през transaction pooler. |
| `BETTER_AUTH_SECRET` | препоръчително | `openssl rand -hex 32` | Подписва сесиите на служителите (Better Auth). Ако липсва, се извежда от `PORTAL_LINK_SECRET`. Смяната изкарва всички служители от профилите им; клиентските линкове не се засягат. |
| `FILES_DIR` | да на сървъра | `/data/files` | Папката с качените файлове (Docker volume, влиза в бекъпа). Локално по подразбиране е `.data/files`. Вътре са папките `change-attachments`, `decision-signatures`, `organization-logos`. |
| `PORTAL_LINK_SECRET` | **да, задай го изрично** | Дълъг случаен низ (`openssl rand -hex 32`) | Ако липсва, кодът взима `SUPABASE_SECRET_KEY` (стара стойност, ако още е зададена), а ако и той липсва, `DATABASE_URL`. **Смяна на стойността обезсилва всички клиентски линкове.** Първо провери каква стойност ползва сегашната среда и я запази. |
| `CRON_SECRET` | да | Случаен низ, поне 16 знака | Cron задачите го пращат като `Authorization: Bearer …`. |
| `SMTP_HOST` | да | `smtp.hostinger.com` | Имейлите излизат през пощата `info@pakto.net` (Hostinger Email Starter, 1000 писма на 24 часа). Ако липсва, кодът пада обратно на Resend. |
| `SMTP_PORT` | не | `465` (по подразбиране) | 465 е SSL; при 587 връзката минава на STARTTLS. |
| `SMTP_USER` | да | `info@pakto.net` | Пощенската кутия, от която се праща. |
| `SMTP_PASSWORD` | да | Паролата на кутията от hPanel → Emails | Тайна. Само в `.env` на сървъра. |
| `EMAIL_FROM` | да | `Pakto <info@pakto.net>` | Адресът трябва да е същата кутия като `SMTP_USER` (или неин alias), иначе Hostinger отказва писмото. Отговорите към фирмата минават през `Reply-To`. |
| `EMAIL_DAILY_LIMIT` | не | `1000` (по подразбиране) | Лимитът на кутията за 24 часа. При 90 % известията и напомнянията чакат в опашката; кодовете, линковете и поканите минават винаги. При Standard плана: `3000`. |
| `RESEND_API_KEY` | не | Ключ от resend.com | Само резервен вариант, докато няма `SMTP_HOST`. Ще се махне при миграцията. |
| `SUPPORT_EMAIL` | да | напр. `support@pakto.net` | Тук идват сигналите от формата „Връзка с нас“ (`/contact`) заедно със снимките като прикачени файлове. Нищо не се пази в базата. Без него формата показва грешка. |
| `NODE_ENV` | да | `production` | |

---

## 2. Cron задачи (вместо Vercel Cron)

`vercel.json` ще остане без значение. Задачите се пускат с crontab на VPS-а, като `curl` към приложението:

```cron
# Изтриване на профили след гратисния период: всеки ден в 03:00
0 3 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://pakto.net/api/cron/purge-accounts > /dev/null

# Напомняния, изтичане на оферти и дневното писмо до клиентите за графика: всеки ден в 07:00 (Europe/Sofia)
0 7 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://pakto.net/api/cron/offer-reminders > /dev/null

# Опашката с имейли: повторни опити за известия и напомняния, изчистване на записи по-стари от 30 дни: всяка минута
* * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://pakto.net/api/cron/email-outbox > /dev/null
```

- Провери часовата зона на сървъра (`timedatectl`) и пусни процеса с `TZ=Europe/Sofia`: част от датите в сървърните страници (`document-status-rail`, `document-timeline`, бележки, съобщения, екип, каталог, портал) се форматират без изрична зона и на UTC ще се изместят с 2–3 часа (QA EDGE-07). Горните часове предполагат `Europe/Sofia`. Ако сървърът е на UTC, извади 2–3 часа.
- `CRON_SECRET` трябва да е достъпен за crontab: сложи го в `/etc/environment` или директно в реда.
- Когато се добави нова cron задача, запиши я тук.

---

## 3. Reverse proxy (nginx) и HTTPS

- Next.js върви на `localhost:3000` (PM2 или systemd), а nginx е отпред. SSL е с Let's Encrypt (`certbot --nginx`).
- **Задължително се подават реалните IP адреси.** Кодът взима IP-то на клиента от `X-Forwarded-For` / `X-Real-IP` (`src/lib/http/client-ip.ts`). То се записва като доказателство при одобрение. Без тези редове всички решения ще са от `127.0.0.1`:
  ```nginx
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  ```
- `client_max_body_size 20m;`: подписът се праща в server action (до ~400 KB). Прикачените файлове (до 15 MB) отиват на `PUT /api/uploads`, затова лимитът трябва да е поне 16m. Формата `/contact` праща до 3 снимки по 5 MB (общо до 10 MB) в server action, затова лимитът не бива да пада под 12m.
- Server Actions: ако домейнът зад proxy е различен, провери `experimental.serverActions.allowedOrigins` в `next.config.ts`.
- **HSTS се слага тук**, не в Next.js, защото https свършва в nginx. `X-Frame-Options`, `nosniff` и `Referrer-Policy` вече идват от `next.config.ts` за всички страници:
  ```nginx
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  ```
  Първо провери, че всички поддомейни са на https; `includeSubDomains` не се връща лесно назад.
- **Лимити срещу злоупотреби** (приложението има свои само за кодовете, съобщенията, линковете и `/contact`). В `http {}`:
  ```nginx
  limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
  limit_req_zone $binary_remote_addr zone=portal:10m rate=30r/m;
  ```
  и в `server {}` `location` блокове за `/sign-in`, `/sign-up`, `/forgot-password` (`zone=auth burst=5 nodelay`) и `/access/` (`zone=portal burst=10 nodelay`). Server Actions минават като POST към същия път, така че лимитът ги хваща.
- Пред VPS-а е добре да има Cloudflare (безплатният план спира обемни атаки). Тогава реалният IP на клиента идва в `CF-Connecting-IP`: nginx трябва да го приеме само от IP адресите на Cloudflare (`set_real_ip_from` + `real_ip_header CF-Connecting-IP`), иначе в доказателството за решението ще е IP-то на Cloudflare.

---

## 4. Build и стартиране

**Скорост: сървърът трябва да е близо до базата.** Всяка заявка до Supabase (eu-central-1, Франкфурт) е един мрежов обиколен път. От България той е около 45 ms, от VPS във Франкфурт около 1–5 ms. Страниците правят по 3–5 такива последователни кръга, така че регионът на VPS-а решава дали страницата се отваря за 400 ms или за под 100 ms. Избери Hostinger VPS в Германия (Франкфурт) или най-близкия възможен.

- Кодът държи до 20 връзки към pooler-а (`DATABASE_URL`, transaction mode, порт 6543) и ги пази отворени 30 минути. При старт `src/instrumentation.ts` отваря 16 от тях предварително, защото нова връзка струва около 0,5 s.
- Стартирай един процес (не cluster с много инстанции): всеки процес има свой pool.

```bash
pnpm install --frozen-lockfile
pnpm build          # next build --webpack; NEXT_PUBLIC_* трябва да са зададени ТУК
pnpm start          # или през PM2: pm2 start "pnpm start" --name pakto
```

- Node версия: същата като локално (провери с `node -v`) или LTS ≥ 20.
- PDF-ът ползва шрифтовете в `src/modules/pdf/fonts/`. Те трябва да са на сървъра. `outputFileTracingIncludes` в `next.config.ts` ги включва, ако се ползва `output: "standalone"`.
- Помисли за `output: "standalone"` за по-лек деплой.
- **Меко спиране (graceful shutdown).** Имейлите към екипа и отговорите към клиента се пращат с `after()`, след като потребителят вече е получил отговор. При рестарт сървърът трябва да получи `SIGTERM` и да има 10–30 секунди да довърши, иначе имейлите от последните секунди се губят. PM2: `kill_timeout: 30000`. Docker: `stop_grace_period: 30s`.

---

## 5. Вход на служителите (Better Auth)

- Входът е в приложението (`src/lib/auth/server.ts`, Better Auth), таблиците са `app.auth_users`, `app.auth_sessions`, `app.auth_accounts`, `app.auth_verifications`. Паролите са bcrypt (пренесени от Supabase Auth на 05.10.2026, без смяна).
- Линковете в писмата водят към `NEXT_PUBLIC_APP_URL/api/auth/...`, затова той трябва да е точният публичен адрес. Нищо не се настройва във външна услуга.
- Лимити за опити (`src/lib/auth/limits.ts`, в паметта на процеса): вход 30 на 5 мин. от IP и 10 на 15 мин. за имейл; регистрация 10 на IP и 3 на имейл за 15 мин.; писма (нов линк, забравена парола) 10 на IP и 3 на имейл за 15 мин. Лимитите искат реалния IP в `X-Forwarded-For` от proxy-то.
- Файловете са на диска на сървъра под `FILES_DIR` (`src/lib/storage/`), в папки с имената на старите buckets:
  - `change-attachments`: снимки и PDF към оферти; отварят се само през `/api/attachments/[id]` след проверка на достъпа;
  - `decision-signatures`: рисунки на клиенти при решение, само за PDF и страницата на офертата;
  - `organization-logos`: фирмени лога, оптимизирани до PNG от сървъра (`sharp`); публични през `/api/logos/...`, кеширани за година, защото името е хеш на съдържанието.
  - Качването: сървърното действие дава подписан билет за 10 минути (`createUploadTicket`), браузърът праща файла на `PUT /api/uploads`. Този път е изключен от `proxy.ts`, иначе лимитът 12 MB на proxy-то би спрял прикачените файлове до 15 MB. Ако има nginx/Caddy отпред, лимитът за тяло трябва да е поне 16 MB.
  - Пренос от Supabase Storage: `node --env-file=.env scripts/copy-supabase-files.mjs` (пропуска файловете, които вече са там).
- Миграциите се прилагат само от `supabase/migrations/` (не от `drizzle/`). Последната е `20260926131713_query_indexes`.

---

## 6. Имейли (SMTP на Hostinger)

- Пращат се през пощата `info@pakto.net` (Nodemailer, `src/lib/email/send.ts`). DNS на `pakto.net` вече има MX, SPF, DKIM (3 записа) и DMARC `p=none`, сложени от Hostinger. След 2–4 седмици без проблеми DMARC може да мине на `p=quarantine`.
- Всяко писмо оставя ред в `app.email_outbox` (вид, получател, статус, грешка). Оттам се брои дневният лимит и се виждат неизпратените. Текстът се пази само докато писмото чака повторен опит; кодовете и личните линкове не се пазят изобщо. Записите се трият след 30 дни.
- Известията към екипа и клиента, напомнянията, дневното писмо за графика и отговорите на въпроси се опитват отново при временна грешка (след 1, 5, 15, 60 и 180 минути) от cron `email-outbox`. Кодовете, линковете, поканите, изпратената оферта, разписката с PDF и контактната форма се пращат веднага и при грешка човекът вижда причината на български.
- Имейлите, които приложението праща:
  - **към клиента:** линк към офертата, код за потвърждение, разписка с PDF, „обновена оферта“ с разликите, напомняния (3 дни без решение и 2 дни преди края на срока), отговор на въпрос, записано или коригирано плащане, отговор на оспорване и на „Платих“, анулирана или изтекла оферта, искане за приемане на работата, едно дневно писмо за промени в графика на клиент, с раздел за всеки негов обект (от cron `offer-reminders`); темите на имейлите към клиента започват с „[име на обекта]“;
  - **към теб (собственика на Pakto):** всяко съобщение от формата „Връзка с нас“ (`/contact`). Отива на адреса от **`SUPPORT_EMAIL`**, който трябва да се настрои при миграцията (напр. `support@pakto.net` или личната ти поща). Ако е на собствения домейн, първо създай пощенската кутия (или пренасочване) в Hostinger, иначе запитванията няма къде да пристигнат. Бутонът „Отговор“ в имейла отговаря директно на подателя (`Reply-To`);
  - **към екипа:** одобрение, отказ, искане на промяна, оспорване, въпрос от клиента, изтекла оферта, оспорено плащане, „Платих“ от клиента, приета работа или забележки, потвърден имейл на клиента. Всеки служител избира кои иска в Настройки → Известия.
- Колко писма са излезли за последните 24 часа: `select count(*) from app.email_outbox where status = 'sent' and created_at > now() - interval '24 hours';` Неизпратените: `status in ('queued', 'failed')`.

---

## 7. Проверка след пускане

- [ ] Вход и регистрация работят (auth callback към новия домейн).
- [ ] Нова оферта → изпращане → имейлът стига и линкът отваря портала.
- [ ] В портала: код на имейла → подпис → одобрение. Подписът се вижда в PDF-а.
- [ ] В „Доказателство за решението“ IP адресът е реалният, не `127.0.0.1`.
- [ ] `curl` към двата cron endpoint-а с грешен ключ връща 401, а с верния връща JSON.
- [ ] Старите клиентски линкове (от преди миграцията) още работят (`PORTAL_LINK_SECRET` е същият).
- [ ] Известията на живо (`/api/live`, Postgres `LISTEN/NOTIFY`) идват без презареждане. Proxy-то не бива да буферира `text/event-stream`.
- [ ] `SUPPORT_EMAIL` е зададен и кутията съществува: изпрати тестово съобщение от `/contact` със снимка, то трябва да пристигне с прикачения файл, а „Отговор“ да отиде до подателя.

---

## Дневник на промените в този файл

- **05.10.2026**: собствен Postgres 17 в Docker на VPS-а (`deploy/compose.yml`, папка `/opt/pakto`). Файл `/opt/pakto/.env` с `POSTGRES_OWNER_PASSWORD` и `POSTGRES_APP_PASSWORD` (генерирани на сървъра, права 600, никога в git). `DATABASE_URL` на приложението ще е `postgres://pakto_app:<парола>@postgres:5432/pakto` с `DATABASE_SSL=false`, `DATABASE_MIGRATION_URL` с `pakto_owner`. Миграциите са в `db/migrations/` (dbmate): `docker compose --env-file ../.env --profile tools run --rm migrate`. Портът на базата не е публикуван. Приложението още не е на сървъра.
- **05.10.2026**: входът на служителите минава през Better Auth вместо Supabase Auth (раздел 5); live известията през `LISTEN/NOTIFY` и `/api/live` вместо Supabase Realtime. Нови env `BETTER_AUTH_SECRET`, `DATABASE_SSL`; махнати `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. Нови таблици `app.auth_*`. Без нов cron или папка за файлове.
- **05.10.2026**: файловете се пазят на диска (`FILES_DIR`, нова env) вместо в Supabase Storage. Нови маршрути `PUT /api/uploads` и `GET /api/logos/...`; скрипт `scripts/copy-supabase-files.mjs`. `SUPABASE_SECRET_KEY` остава само за Auth. Без нов cron.
- **05.10.2026**: имейлите минават през SMTP на Hostinger (`info@pakto.net`) вместо Resend. Нови env `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_DAILY_LIMIT`; `RESEND_API_KEY` става резерва. Нова таблица `app.email_outbox`, нов cron `email-outbox` всяка минута. Без нов bucket.
- **05.10.2026**: домейнът е `pakto.net` (не `pakto.eu`), всичко на един домейн (`https://pakto.net`, приложението на `/app`). Пълната нова схема (Docker, Caddy, SMTP) е в `docs/production-migration-plan.md`; този файл ще се пренапише при миграцията.

- **29.09.2026**: хедъри за сигурност на всички страници (`next.config.ts`); HSTS, лимити в nginx и Cloudflare описани в раздел 3; проверка на лимитите в Supabase Auth (раздел 5). Без нови env, cron или bucket.

- **28.09.2026**: форма „Връзка с нас“ (`/contact`). Нова env `SUPPORT_EMAIL`: адресът, на който идват запитванията (**задължително се настройва при миграцията**). Server actions и proxy приемат до 12 MB заради снимките. Няма нови таблици, cron и buckets.

- **26.09.2026**: бързодействие. Pool 20 връзки с 30 мин. живот, предварително отваряне при старт (`src/instrumentation.ts`), миграция `20260926131713_query_indexes`. Бележка за региона на VPS-а (Франкфурт).

- **26.09.2026**: няколко оферти в един обект, условия за плащане, приемане на работата, „Платих“, жизнен цикъл на обекта и контактите. Шест нови миграции (последната `20260926121444_multiple_offers_per_project`). Няма нови env и buckets; `offer-reminders` праща и дневното писмо до клиентите, повече имейли към клиента (провери лимита в Resend).

- **24.09.2026**: Фаза D. Таблици за каталог и шаблони, колони за отстъпка. Тригерът за замразени версии пази и отстъпката. Няма нови env/cron.
- **29.09.2026**: телефон на фирмата (`organizations.phone`); съобщенията са само по оферти (`document_messages.change_order_id` not null, общите тестови съобщения изтрити). Без нови env, cron или bucket.
- **26.09.2026**: размер на логото (`organizations.logo_size`) и индикатор за сваляне на файлове.
- **26.09.2026**: фирмено лого. Нов public bucket `organization-logos`, колона `change_order_revisions.logo_storage_path`, зависимост `sharp`.
- **24.09.2026**: Фаза C. Имейл известия към екипа с `after()` (нужно е меко спиране), нови таблици за бележки, разговори и настройки за известия, bucket `decision-signatures` в изтриването на фирма.
- **24.09.2026**: първа версия. Добавени cron `offer-reminders`, bucket `decision-signatures`, бележка за `PORTAL_LINK_SECRET` и `X-Forwarded-For`.
- **06.10.2026**: приложението работи на сървъра. Всичко е в `deploy/compose.yml` (проект `deploy`): `postgres`, `app` (образ от `Dockerfile`, Next standalone, непривилегирован потребител, healthcheck `/api/health`), `caddy` (HTTPS, `www` → без `www`, `flush_interval -1` за SSE, тяло до 20 MB), `cron` (`deploy/cron/loop.sh`: имейл опашка всяка минута, `purge-accounts` в 03:00, `offer-reminders` в 07:00 по София, с `CRON_SECRET`), `backup` (`deploy/backup/run.sh`: 01:00 UTC `pg_dump` + архив на файловете в `/opt/pakto/backups`, 14 дни; ръчно: `docker compose exec -e BACKUP_NOW=1 backup sh /run.sh`). Деплой на ръка: `rsync` на кода в `/opt/pakto/src`, после `cd /opt/pakto/deploy && docker compose --env-file ../.env build app && docker compose --env-file ../.env up -d`. Миграции: `docker compose --env-file ../.env --profile tools run --rm migrate`. Още няма офсайт бекъп, външен монитор и GitHub Actions деплой.
