# План за миграция към собствен сървър (Hostinger KVM 2)

Цел: Pakto работи изцяло на наш сървър. Без Supabase (база, Auth, Storage, Realtime) и без Resend. Имейлите излизат от наша пощенска кутия в Hostinger.

Статус: **план, нищо не е започнато** (04.10.2026).

---

## 0. Решението накратко

| Слой | Сега | След миграцията | Защо |
|---|---|---|---|
| Сървър | — | **Hostinger KVM 2** (2 vCPU, 8 GB RAM, 100 GB NVMe), Ubuntu 24.04 LTS | Стига с много запас за пилота |
| Пускане | — | **Docker Compose** (без Coolify/Dokploy) | Повтаряемо, един файл описва всичко, лесен rollback |
| HTTPS / proxy | (планиран nginx) | **Caddy** | Сам взима и подновява сертификатите; стрийминг и SSE работят без настройки |
| База | Supabase Postgres 17.6 | **Postgres 17** в контейнер, само във вътрешната Docker мрежа | Същата версия, само схемата `app` |
| Вход на служители | Supabase Auth | **Better Auth** (Drizzle адаптер, същата база) | Стандартът за Next.js в момента; има официално ръководство за миграция от Supabase; паролите (bcrypt) се пренасят, никой не сменя парола |
| Файлове | Supabase Storage (3 bucket-а) | **Локален диск** (`/data/files`, Docker volume) + офсайт бекъп | 6 файла днес; S3 сървър (MinIO е архивиран, Garage/SeaweedFS) е излишна сложност за един сървър |
| Live известия | Supabase Realtime | **Postgres `LISTEN/NOTIFY` + SSE** route в Next | Една инстанция → без Redis, без външна услуга |
| Имейли | Resend (100/ден) | **Nodemailer → SMTP на Hostinger Business Email** + опашка (`email_outbox`) в базата | 1000 писма/ден на кутия (Starter, избран за бетата), 3000 (Standard); ние държим лог и повторни опити |
| Cron | (Vercel cron като справка) | Малък контейнер `cron` (curl към `/api/cron/*`) | Всичко в един compose файл |
| Бекъпи | Supabase | `pg_dump` всяка нощ + файловете → **restic** към офсайт хранилище (Backblaze B2, безплатните 10 GB) + седмичен snapshot в Hostinger | Правило 3-2-1; бекъп на същия сървър не е бекъп |
| Деплой | — | GitHub Actions строи image → GHCR → `docker compose pull && up -d` по SSH | Сървърът не строи (8 GB RAM, без прекъсване от build) |
| Локална разработка | Supabase в облака | `docker compose` с Postgres + **Mailpit** (лови всички писма) | Без лимита „само до един адрес“ |

**Защо Docker, а не „на голо“ (Node + PM2 + Postgres от apt):** версиите на Node и Postgres са заковани в image-ите, нов сървър се вдига с `git clone` + `.env` + `docker compose up`, а rollback е смяна на тага на image-а. Цената е малко повече RAM (пренебрежимо при 8 GB).

**Защо не Coolify / Dokploy:** удобен UI, но добавя още една система за поддръжка (~1 GB RAM, собствени обновявания и бъгове) между нас и Docker. За един проект на един сървър compose файлът е по-прост и по-прозрачен. Може да се добави по-късно без промяна в приложението.

**Защо не собствен пощенски сървър (Postfix/Mailcow на VPS-а):** нов IP без репутация → писмата отиват в спам; порт 25 често е блокиран; поддръжката е тежка. Пращаме **през** пощенската кутия на Hostinger (SMTP), а „своята функционалност“ е в кода: опашка, лог, повторни опити, шаблони.

---

## 1. Какво зависи от Supabase днес (инвентар)

Данните са малко: **16 MB база, 5 потребителя, 6 файла**. Миграцията е основно **код**, не данни.

### Auth (Supabase Auth, `@supabase/ssr`)
- `src/proxy.ts`: `getClaims()` пази `/app`, `/onboarding`, `/sign-in`, `/sign-up`
- `src/lib/authz/tenant-context.ts`: `getSessionUserId()` чрез `getClaims()`
- `src/modules/auth/actions.ts`: `signUp`, `signInWithPassword`, `resetPasswordForEmail`, `resend` (потвърждение), `updateUser({ password })`
- `src/modules/account/actions.ts`: смяна на имейл и парола (`updateUser`)
- `src/modules/account/purge.ts`: `auth.admin.deleteUser`
- `src/app/auth/callback/route.ts`, `src/app/auth/signed-out/route.ts`: `exchangeCodeForSession`, `signOut`
- `src/app/join/[token]/page.tsx`, `src/app/onboarding/page.tsx`, `src/app/app/settings/page.tsx`, `src/modules/team/actions.ts`, `src/modules/organizations/actions.ts`, `src/modules/support/sender.ts`, `src/app/api/account/export/route.ts`: четат текущия потребител
- Писмата за потвърждение и забравена парола днес ги праща **Supabase** (не нашият `sendEmail`)

### Storage (bucket-и `change-attachments`, `decision-signatures`, `organization-logos`)
- Качване от браузъра със signed upload URL: `src/components/change-orders/attachment-upload.ts`, `src/components/settings/logo-uploader.tsx` (+ `createSignedUploadUrl` в `attachment-actions.ts`, `organizations/actions.ts`)
- Сваляне, триене, списък: `attachment-actions.ts`, `attachment-data.ts`, `organizations/logo.ts`, `change-portal/signature.ts`, `account/purge.ts`, `src/app/api/attachments/[attachmentId]/route.ts` (signed URL за 60 s)

### Realtime
- `src/components/workspace/live-notifications.tsx`: частен канал `staff:<userId>`, събитие `refresh`
- Тригер в базата: `realtime.send(...)` при ново `staff_notifications` (миграция `20260923103123_madeflow_pilot_core.sql`) и политика `madeflow_staff_receive` върху `realtime.messages`

### База (специфични за Supabase неща в миграциите)
- `REVOKE ... FROM anon, authenticated` (тези роли няма да съществуват), RLS политики с `auth.uid()`, `storage.buckets`, `realtime.*`
- → Старите миграции **не се преиграват** на новия сървър. Правим **baseline** от текущата схема `app` (виж фаза 6).
- Разширения, които ни трябват: `pg_trgm`, `pgcrypto`, `uuid-ossp` (всички са в официалния image `postgres:17`)

### Env, които изчезват
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`

---

## 2. Целева архитектура

```
                 Интернет (80/443)
                        │
                 ┌──────▼──────┐
                 │    caddy    │  TLS (Let's Encrypt), HSTS, gzip/zstd
                 └──────┬──────┘
          docker мрежа  │  (нищо друго не е публично)
      ┌─────────────────┼──────────────────┐
┌─────▼─────┐     ┌─────▼─────┐      ┌─────▼─────┐
│    app    │────▶│ postgres  │      │   cron    │──▶ app /api/cron/* (Bearer CRON_SECRET)
│ Next.js   │     │    17     │      └───────────┘
│standalone │     └─────┬─────┘      ┌───────────┐
└─────┬─────┘           │            │  backup   │──▶ pg_dump + /data/files ──restic──▶ офсайт
      │ /data/files     │ volume     └───────────┘
      │ (volume)        │ pgdata
      ▼
 SMTP smtp.hostinger.com:465 ──▶ info@pakto.net
```

- Едно копие на приложението. Live известията се разпращат в паметта на процеса (`LISTEN` в един postgres.js клиент → SSE към браузърите).
- Postgres **не публикува порт навън**. Внимание: Docker заобикаля `ufw`, затова в compose няма `ports:` за postgres. Достъп за администриране: `docker compose exec postgres psql` или SSH тунел.
- Две роли в базата: `pakto_owner` (миграции, собственик на схемата) и `pakto_app` (приложението; само `SELECT/INSERT/UPDATE/DELETE` + `EXECUTE`). Защитите срещу промяна на изпратени оферти (тригерите) остават в базата.

### Ресурси на KVM 2 (ориентировъчно)
| Контейнер | RAM |
|---|---|
| postgres (`shared_buffers=1GB`, `effective_cache_size=4GB`) | 1–2 GB |
| app (Next.js) | 0.5–1 GB |
| caddy, cron, backup | < 200 MB |
| Свободно за ОС и page cache | ~4 GB |

---

## 3. Компонентите в детайл

### 3.1 Auth: Better Auth
- Пакет `better-auth` + Drizzle адаптер. Таблици `user`, `session`, `account`, `verification` в отделна схема `auth` (освобождава се след Supabase), описани в `src/db/schema/index.ts`.
- **ID-тата остават същите UUID-и** (`advanced.database.generateId: "uuid"` + миграцията вмъква старите `id`). Така `app.profiles.id`, `organization_members.user_id` и всичко останало не се пипа.
- **Пароли:** Supabase пази bcrypt в `auth.users.encrypted_password`. Better Auth се настройва с `password.verify` през bcrypt, така че всички влизат със старата си парола. Новите пароли също са bcrypt (или: проверка bcrypt → при успешен вход се хешира наново със scrypt; по-късно).
- **Писма:** `sendVerificationEmail`, `sendResetPassword`, `changeEmail.sendChangeEmailVerification` минават през нашия `sendEmail()`. Плюс: шаблоните стават на български и в нашия дизайн (днес са на Supabase).
- **Сесии:** HttpOnly cookie, сесиите в Postgres, `cookieCache` (~5 мин.) за да не удря базата на всеки request. `requireTenantContext()` така или иначе проверява членството в базата.
- **`src/proxy.ts`:** само бърза проверка дали има session cookie (`getSessionCookie`) за пренасочване; истинската проверка е в `getSessionUserId()` чрез `auth.api.getSession({ headers })`.
- **Rate limit** на входа и забравената парола: вграденият в Better Auth (в базата).
- **Изтриване на профил:** `purge.ts` трие реда в `auth.user` (сесиите и акаунтите падат с cascade).
- `/auth/callback` вече не е нужен: линковете в писмата водят към Better Auth endpoint-и, които пренасочват към `/update-password` или `/app`.
- Порталът на клиента **не се променя** (той и сега е наш: `change-portal/session.ts`).

### 3.2 Файлове: локален диск зад наш интерфейс
- Нов модул `src/lib/storage/` с `put`, `get` (stream), `remove`, `list`, `createUploadToken`. Пътища: `/data/files/<bucket>/<path>`, имената на bucket-ите остават.
- **Качване:** вместо signed URL към Supabase, браузърът прави `PUT /api/uploads/<token>`; токенът е HMAC (`FILES_SECRET`), важи 10 мин., носи bucket, път, лимит на размера (същите `MAX_BYTES`) и разрешени MIME типове. После съществуващите server action-и потвърждават качването, както сега.
- **Сваляне:** `/api/attachments/[attachmentId]` стриймва файла директно (с правилните `Content-Type`, `Content-Disposition`, `Cache-Control: private, no-store`) вместо redirect към signed URL. Достъпът се проверява както сега.
- Записът е атомарен (временен файл → `rename`), пътищата се валидират (без `..`).
- Ако някога трябват няколко сървъра или по-голям обем: същият интерфейс получава S3 имплементация (Hetzner/Backblaze/Cloudflare R2), без промяна в модулите.

### 3.3 Live известия: `LISTEN/NOTIFY` + SSE
- Тригерът за `staff_notifications` вика `pg_notify('staff_refresh', json_build_object('user_id', ..., 'event_type', ..., 'title', ...)::text)` вместо `realtime.send`.
- В приложението: един `sql.listen('staff_refresh', ...)` (postgres.js) → в паметта `Map<userId, Set<клиенти>>`.
- Нов route `GET /api/live` (SSE, `text/event-stream`, проверява сесията) → праща `refresh`. Caddy пуска SSE без буфериране.
- `live-notifications.tsx` преминава на `EventSource('/api/live')`. Логиката „при повторна връзка → `router.refresh()`“ и при скрит таб остава същата (EventSource сам се свързва отново).

### 3.4 Имейли: Nodemailer + Hostinger SMTP + опашка
1. **Смяна на транспорта** (малка стъпка, може и сега): `src/lib/email/send.ts` използва `nodemailer.createTransport({ host: SMTP_HOST, port: 465, secure: true, auth })` с pooled връзка. `brandedLayout`, вграденото лого (`cid:`), `Reply-To` остават. `emailFailureReason` се пренаписва за SMTP кодове (535 грешен вход, 550/553 отхвърлен адрес, 421/451/452 лимит/временно).
2. **Опашка `app.email_outbox`:** `id, kind, to, subject, html, text, reply_to, priority, status (queued/sending/sent/failed), attempts, next_attempt_at, last_error, created_at, sent_at`.
   - **Веднага** (синхронно, с лог в опашката): OTP кодове, потвърждение на профил, забравена парола. Потребителят чака на екрана.
   - **През опашката:** известия, напомняния, дайджести. Изпращат се в `after()` след заявката, а cron на всяка минута взима неуспелите с exponential backoff (1, 5, 15, 60 мин.; до 6 опита).
   - Дневен брояч: при приближаване до лимита (напр. 900/1000) неспешните писма чакат до следващия ден, OTP минава винаги.
   - Плюс: виждаме колко пращаме на ден и кое не е стигнало.
3. **Подател:** кутия `info@pakto.net` (Hostinger Email **Starter**: 1000 изходящи/ден в плъзгащ се 24-часов прозорец, лимитът е на кутия; до 100 получатели на писмо; до 35 MB на писмо). „From“ винаги е тази кутия. Отговорите отиват към фирмата чрез `Reply-To` (както сега). Не можем да пращаме „от името“ на адреса на фирмата.
4. **DNS (задължително за да не отиват в спам):** MX към Hostinger, SPF (`v=spf1 include:_spf.mail.hostinger.com ~all`), DKIM от hPanel, DMARC (`p=none` с отчети първите 2–4 седмици → `p=quarantine`).
5. **Ако растем:** същият Nodemailer, други `SMTP_*` стойности (Amazon SES, Brevo, Mailgun). Без промяна в кода.
6. **Локално:** Mailpit в `docker-compose.dev.yml` лови всичко (UI на :8025). Край на ограничението „само до един адрес“.

### 3.5 База и миграции
- `postgres:17` (същият major като Supabase 17.6), volume `pgdata`, `pg_stat_statements` за бавни заявки.
- **Baseline:** `pg_dump --schema-only --schema=app --no-owner --no-privileges` от Supabase → почистване (махат се политиките с `auth.uid()`, `realtime`/`storage` препратките, `REVOKE ... anon, authenticated`) → `db/baseline.sql`. Новият сървър тръгва от него.
- **Нови миграции:** продължават като SQL файлове, но в `db/migrations/` с **dbmate** (един binary, чист SQL, пази `schema_migrations`). Пускат се от отделен контейнер при деплой, преди новата версия на приложението. `supabase/migrations/` и `drizzle/` остават като история.
- RLS: таблиците нямат нужда от него (браузърът никога не говори с базата), но не пречи. Махаме само политиките, които сочат към `auth.uid()`.
- `DATABASE_URL` → `pakto_app`, `DATABASE_MIGRATION_URL` → `pakto_owner` (вече ги има в `src/lib/env/server.ts`).
- **Направено (05.10.2026):** `deploy/compose.yml` (Postgres 17 със `deploy/postgresql.conf`, без публикуван порт; `migrate` = dbmate), `deploy/postgres-init/01-setup.sh` (схема `extensions`, `pg_trgm`/`pgcrypto`, роля `pakto_app` с DEFAULT PRIVILEGES). На сървъра: `/opt/pakto/{deploy,db,.env}`, паролите са генерирани там (`.env`, права 600).
- **Копие на данните** (бележка: сървърът сега държи снимка от Supabase от 05.10.2026; при преминаването се прави наново): `pg_dump --data-only -Fc` от Supabase → `pg_restore --disable-triggers` в новата база; броят редове по таблици съвпада на всички 49 таблици.
- Проверено с ролята `pakto_app`: чете и пише, `CREATE`/`DROP` са отказани, тригерът за неизменяемите записи отказва `DELETE`, 28 тригера са на място.

### 3.6 Cron
Контейнер `cron` с `supercronic` и TZ `Europe/Sofia`:
- `0 3 * * *` → `/api/cron/purge-accounts`
- `0 7 * * *` → `/api/cron/offer-reminders`
- `* * * * *` → `/api/cron/email-outbox` (нов)

### 3.7 Бекъпи и възстановяване
- Всяка нощ: `pg_dump -Fc` + `/data/files` → **restic** (криптиран, дедупликиран) към офсайт: **Backblaze B2, безплатен план (10 GB)**. Нашите бекъпи са няколко MB, restic пази само разликите, така че ще сме далеч под лимита години наред. Резерва: Cloudflare R2 (също 10 GB безплатно, но иска карта). Пазим 7 дневни, 4 седмични, 12 месечни.
- Седмичен snapshot на целия VPS в Hostinger (втори слой, не основен).
- **Тест на възстановяването веднъж месечно** на локална машина: бекъп, който не е пробван, не е бекъп.
- По-късно, при реални клиенти: непрекъснат WAL архив (pgBackRest/WAL-G) за възстановяване до минута.

### 3.8 Сигурност на сървъра
- Само SSH ключ, без вход с парола, без `root` по SSH; отделен потребител `deploy` в групата `docker`.
- `ufw`: само 22, 80, 443. `fail2ban` за SSH. `unattended-upgrades` за security обновления.
- Тайните в `/opt/pakto/.env` (`chmod 600`), никога в git и в image-а.
- Caddy слага HSTS (вместо nginx от `deployment-notes.md`).
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` фиксиран, за да не се чупят отворените форми след деплой; `deploymentId` = git sha (защита от version skew, по документацията на Next 16 за self-hosting).

### 3.9 Наблюдение
- `GET /api/health` (проверява базата) → външен uptime монитор (UptimeRobot или Better Stack, безплатен план). Външен, защото ако сървърът падне, вътрешен монитор пада с него.
- Логове: Docker `json-file` с ротация (`max-size: 10m`, `max-file: 5`).
- Аларма по имейл при: сайтът не отговаря, бекъпът не е минал, опашката с писма > 50 неизпратени.

### 3.10 Деплой
1. Push в `main` → GitHub Actions: `pnpm install`, `typecheck`, `lint`, `docker build` (Next `output: "standalone"`; `NEXT_PUBLIC_APP_URL` се подава при build, защото се вгражда) → push в GHCR с таг git sha.
2. SSH към сървъра: `docker compose pull` → `docker compose run --rm migrate` (dbmate) → `docker compose up -d app`.
3. Прекъсване от няколко секунди при рестарт. Достатъчно за пилота; blue/green може по-късно.
4. Rollback: предишният таг в `.env` (`APP_IMAGE_TAG`) → `docker compose up -d app`.

### 3.11 Локална разработка
_Статус: файловете са готови и анонимизацията е изпробвана върху копие на сървъра; целият `db:pull` и `db:up` още не са пускани на Mac-а (няма Docker)._

Правило: **локалното приложение никога не се свързва с продукционната база.** Иначе тестово изпращане на оферта стига до реален клиент, тестови решения остават завинаги (`portal_decisions` и `timeline_events` са append-only), а локално пробвана миграция се изпълнява върху прод преди кода.

**Какво върви локално** (`docker-compose.dev.yml`, вдига се с `docker compose -f docker-compose.dev.yml up -d`):
- `postgres:17`, същият като на сървъра, на `localhost:5432`, volume `pakto-dev-pgdata`
- **Mailpit**: SMTP на `localhost:1025`, UI на `http://localhost:8025`. Всички писма от приложението (OTP, известия, напомняния, auth писма) остават там. Нищо не излиза навън, дори с истински адреси в базата.
- Файловете: папка `.data/files/` в проекта (в `.gitignore`), същият модул `src/lib/storage/` като на сървъра

**`.env.local`** (без Supabase и Resend):
- `DATABASE_URL=postgres://pakto_app:...@localhost:5432/pakto`, `DATABASE_MIGRATION_URL` с `pakto_owner`
- `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, без потребител и парола
- `FILES_DIR=.data/files`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`

**Команди** (в `package.json`):
- `pnpm db:up`: вдига `docker-compose.dev.yml`
- `pnpm db:migrate`: dbmate прилага `db/migrations/` върху локалната база
- `pnpm db:reset`: изтрива локалната база, прилага `db/baseline.sql` и миграциите, зарежда малък демо набор (`db/seed.sql`: една фирма, служител, клиент, обект, оферта v1 450 € → v2 384 €, както в лендинга)
- **`pnpm db:pull`**: копие на продукционните данни в локалната база

**`pnpm db:pull` стъпка по стъпка** (скрипт `scripts/db-pull.sh`):
1. Пита за потвърждение и показва към коя локална база ще пише. Отказва, ако `DATABASE_URL` не сочи към `localhost`.
2. По SSH на сървъра: `docker compose exec -T postgres pg_dump -Fc --schema=app --schema=auth` → стрийм директно към лаптопа (без временен файл на сървъра, без отворен порт на базата).
3. Локално: изтрива и създава базата наново, `pg_restore`, после `dbmate` прилага миграциите, които са в кода, но още не са на прод.
4. **Анонимизация (по подразбиране включена)**, в една SQL транзакция:
   - имейлите на клиентите и контактите → `client-<id>@example.test`, телефоните → `+359 000 000 000`
   - имейлите на служителите → `staff-<id>@example.test`, **освен** твоя, за да можеш да влизаш
   - паролите на всички служители → една известна локална парола (bcrypt хеш), за да можеш да влезеш като всеки служител и да видиш проблема с неговите права
   - активните сесии, OTP кодовете и токените за клиентски линкове се изтриват; новите линкове се правят локално с локалния `PORTAL_LINK_SECRET`
   - `--raw` пропуска анонимизацията (само ако проблемът зависи от точния имейл)
5. По желание `--files`: `rsync` на `/data/files` от сървъра към `.data/files/` (само ако бъгът е в прикачен файл или лого).
6. Накрая показва колко реда е заредил по таблици и от кога е копието.

Копието живее само на лаптопа (криптиран диск, FileVault). Изтрива се с `pnpm db:reset`, когато вече не трябва.

---

## 4. Фази (малки стъпки, всяка се тества отделно)

Ключов принцип: **всички смени на код (имейли, файлове, live, auth) се правят, докато още сме на Supabase базата.** Postgres си е Postgres. Така всяка стъпка се тества локално и самостоятелно, а финалното преминаване е само копиране на данни и смяна на `DATABASE_URL`.

### Фаза 0: Покупки и DNS (ти)
- [x] Hostinger KVM 2 с Ubuntu 24.04 LTS (Düsseldorf, SSH ключ `~/.ssh/pakto_vps`) (без готов „Coolify“/„Dokploy“ шаблон)
- [x] Hostinger Email **Starter** (купена: кутия `info@pakto.net`; по желание `support@pakto.net` като alias, Starter има 5 alias-а и 5 пренасочвания). **Не** безплатния пробен план: там лимитът е 100/ден
- [ ] Безплатен акаунт в Backblaze B2 (bucket за бекъпи, ключ само за този bucket)
- [ ] DNS на `pakto.net`: `A` за `pakto.net` → IP на VPS-а, `www` (CNAME, вече има) пренасочва към `pakto.net` в Caddy
- [x] Пощата на `pakto.net`: MX, SPF, DKIM (3 записа), DMARC `p=none` (Hostinger ги сложи сам)
- [x] Домейн: всичко на `pakto.net` (лендинг на `/`, приложение на `/app`, портал на `/portal`). `NEXT_PUBLIC_APP_URL=https://pakto.net`. Един сертификат, един cookie домейн, без CORS

### Фаза 1: Локална среда без Supabase облака
- [x] `docker-compose.dev.yml`: Postgres 17 + Mailpit + dbmate (05.10.2026; **не е пускан на Mac-а**: там още няма Docker)
- [x] Baseline схема `db/migrations/20261005160000_baseline.sql` (pg_dump 17 от Supabase, без RLS и политиката с `auth.uid()`) + dbmate; приложена на сървъра
- [x] Команди `db:up`, `db:down`, `db:migrate`, `db:new`, `db:reset`, `db:pull` (`db:migrate` вече е dbmate, не drizzle-kit)
- [ ] Docker на Mac-а (OrbStack или Docker Desktop), после `pnpm db:up` и проверка, че приложението върви на локалния Postgres
- [ ] Демо данни `db/seed.sql` (ПР-042 v1 450 € → v2 384 €); засега `db:pull` е източникът на данни

### Фаза 2: Имейли (може веднага, решава лимита 100/ден)
- [x] Nodemailer транспорт в `src/lib/email/send.ts`, env `SMTP_HOST/PORT/USER/PASSWORD`, `EMAIL_DAILY_LIMIT`. Без `EMAIL_PROVIDER`: SMTP, ако има `SMTP_HOST`, иначе Resend (05.10.2026)
- [x] Таблица `email_outbox` (приложена в Supabase), повторни опити, cron `/api/cron/email-outbox`, дневен брояч (05.10.2026)
- [x] Български съобщения за SMTP грешки (05.10.2026)
- [ ] Паролата на `info@pakto.net` в `.env.local`, проба с реален SMTP
- [ ] Тест: OTP, известие, напомняне, дайджест, контактна форма → Mailpit локално, реална кутия на сървъра; проверка в mail-tester.com (цел ≥ 9/10)

### Фаза 3: Файлове
- [x] `src/lib/storage/` (локален диск, `FILES_DIR`) + `PUT /api/uploads?token=` с подписан билет за 10 мин.; логата през `GET /api/logos/...` (05.10.2026)
- [x] Всички места, които ползваха Supabase Storage, и двата клиентски uploader-а (05.10.2026)
- [x] `scripts/copy-supabase-files.mjs`: 6-те файла копирани в `.data/files` (05.10.2026)
- [x] Тест на качването: 15 MB минава; повторен запис, над лимита, изтекъл/подправен билет, излизане от папката: отказани. Лого: 200, кеш за година
- [ ] Тест в интерфейса: прикачен файл към оферта, лого, подпис, PDF с изображения, изтриване на профил

### Фаза 4: Live известия
- [x] Миграция `20261005140000_staff_refresh_notify`: тригерът вика `pg_notify('staff_refresh', …)` (05.10.2026)
- [x] `GET /api/live` (SSE, heartbeat 25 s) + `src/lib/live/hub.ts` (един `LISTEN` на процес); `live-notifications.tsx` на `EventSource`
- [x] Тест: известие от базата → toast и точка на камбанката без презареждане
- [ ] Тест: две сесии едновременно, рестарт на сървъра (повторна връзка)

### Фаза 5: Auth (най-голямата стъпка)
- [x] Better Auth 1.7.7, таблици `app.auth_*` (в схемата `app`, не `auth`: в Supabase `auth` е заета и така всичко се мести с един dump), UUID-и, bcrypt (05.10.2026)
- [x] Миграция `20261005150000_better_auth`: 5-те потребителя от `auth.users` със същите `id` и пароли
- [x] Всички места от инвентара (1.), `proxy.ts` (само проверка за cookie), `tenant-context.ts`; `/auth/callback` вече само обяснява изтекъл линк; `src/lib/supabase/` и `@supabase/ssr` махнати
- [x] Писмата за потвърждение, нова парола и нов имейл: на български, през `info@pakto.net`
- [x] Лимити за опити (`src/lib/auth/limits.ts`), профил се създава при регистрация (hook)
- [x] Тест: вход със **стара** парола (`+office`); регистрация → писмо → линк → автоматичен вход → onboarding → фирма; забравена парола → писмо → нова парола → вход; изход
- [ ] Тест: смяна на имейл и парола в Настройки, покана в екипа, изтриване на профил, изход от всички устройства

### Фаза 6: Сървърът
- [x] Hardening (3.8): потребител `deploy` (sudo, docker), вход само с ключ `~/.ssh/pakto_vps`, root вход изключен, `ufw` (22, 80, 443 tcp/udp), fail2ban, unattended-upgrades, 2 GB swap
- [x] Docker 29.8 + Compose v5.6 от официалното хранилище, ротация на логовете (10m × 5), папка `/opt/pakto`
- [x] `/opt/pakto`: `deploy/compose.yml` (postgres, app, caddy, cron, backup), `Caddyfile`, `.env`; приложението работи на https://pakto.net (сертификат от Let's Encrypt, www → без www, `/api/health` ok), нощен бекъп проверен ръчно (`BACKUP_NOW=1`)
- [x] GitHub Actions → GHCR → деплой (`.github/workflows/deploy.yml`, `deploy/deploy.sh`; нужен secret `DEPLOY_SSH_KEY`)
- [x] Бекъп контейнер + **пробно възстановяване** (06.10.2026: пълен дъмп, възстановен в чиста база за 1 s, всичките 60 таблици с еднакъв брой редове, хешовете на версиите съвпадат). Остава офсайт копие (B2)
- [ ] `/api/health` + външен монитор
- [ ] `pnpm db:pull` (`scripts/db-pull.sh`) с анонимизация; проба: копие на лаптопа, вход с локалната парола, писмата в Mailpit
- [ ] Пълен QA по `docs/qa-test-plan.md` на сървъра (P0 и P1)

### Фаза 7: Преминаване (cutover)
Виж раздел 5.

### Фаза 8: Почистване
- [ ] Махане на `@supabase/ssr`, `@supabase/supabase-js`, `resend`, `src/lib/supabase/`, Supabase env-овете
- [ ] Пренаписване на `docs/deployment-notes.md` за новата схема (compose, Caddy, SMTP, бекъпи)
- [ ] Обновяване на `CLAUDE.md` (раздел Architecture: Auth, Storage, миграции)
- [ ] Supabase проектът остава на пауза 30 дни, после се трие

---

## 5. Преминаване (runbook)

Данните са малко, затова: кратък прозорец за поддръжка (~30 мин., вечер), без синхронизация в реално време.

1. Ден преди: TTL на DNS записите → 300 s. Новият сървър е готов и тестван с копие на данните.
2. Страница „Поддръжка“ на стария адрес (или просто спиране на локалния/стария deploy).
3. `pg_dump --data-only --schema=app` от Supabase → `pg_restore` в новата база.
4. Скриптовете за потребителите (`auth.users` → Better Auth) и за файловете.
5. Проверка: брой редове по таблици съвпада, контролните суми (`content_hash`) на изпратените оферти съвпадат.
5a. В `/opt/pakto/.env`: `CRON_DAILY_JOBS=on` (до cutover е `off`), `docker compose --env-file ../.env up -d cron`.
6. DNS към новия IP (ако още не е). Caddy взима сертификата.
7. Smoke тест: вход, отваряне на оферта, клиентски линк (`PORTAL_LINK_SECRET` е **същият**, иначе всички клиентски линкове спират), OTP по имейл, PDF, прикачен файл.
8. Първи бекъп ръчно и проверка, че е стигнал офсайт.

**Rollback:** Supabase остава непокътнат до края на прозореца. Ако нещо не е наред: DNS обратно и старият `.env`. След като новата база приеме реални записи, връщането иска обратно копиране; затова решаваме в рамките на прозореца.

---

## 6. Рискове и капани

| Риск | Мярка |
|---|---|
| Docker публикува порт на Postgres и заобикаля `ufw` | Без `ports:` за postgres; проверка с `nmap` отвън |
| Писмата отиват в спам | SPF/DKIM/DMARC преди първото писмо; mail-tester; DMARC отчети |
| Лимит на кутията (1000/ден) | Опашка с приоритети; OTP винаги първо; брояч; смяна на SMTP при растеж |
| Сменен `PORTAL_LINK_SECRET` | Копира се 1:1 в новия `.env` |
| Отворени форми се чупят след деплой | Фиксиран `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `deploymentId` |
| Пълен диск (файлове, логове, WAL) | Ротация на логове; аларма при > 80 %; файловете на отделен volume |
| Един сървър = единична точка на отказ | Офсайт бекъпи + тестван restore; документиран рецепт за нов сървър за < 1 час |
| Better Auth промени в API | Заковани версии в `package.json` (както всички останали) |

---

## 7. Ориентировъчни разходи (месечно, проверете актуалните цени)

- Hostinger KVM 2: основният разход
- Hostinger Email Starter: $0.59/мес. първата година (12-месечен план), после $1.59/мес.
- Офсайт бекъп: 0 € (Backblaze B2, до 10 GB)
- Supabase, Resend: 0 (махат се)

## 8. Решения

1. **Домейн:** `pakto.net/app` (един домейн за лендинга, приложението и портала).
2. **Поща за бетата:** Hostinger Email **Starter**. 1000 писма/ден срещу ~40–150 нужни при 5 фирми; Standard добавя AI функции и „кой е отворил писмото“, които не ни трябват. Надграждането е без миграция, ако някога стигнем ~700/ден (виждаме го от брояча в `email_outbox`).
3. **Офсайт бекъп:** безплатно, Backblaze B2 (10 GB).
4. **Старт:** засега само план; нищо не се изпълнява.

## Дневник
- 04.10.2026: първа версия на плана.
- 04.10.2026: решения: `pakto.net/app`, Hostinger Email Starter, Backblaze B2 (безплатно); засега само план.
- 05.10.2026: VPS `187.7.64.36` (srv2036017.hstgr.cloud, Düsseldorf, Ubuntu 24.04.5) защитен и с Docker; вход: `ssh -i ~/.ssh/pakto_vps deploy@187.7.64.36`.
- 05.10.2026: основният домейн е **`pakto.net`** (не `pakto.eu`); пощата е `info@pakto.net`; VPS и пощата са купени.
- 04.10.2026: добавена локална разработка (3.11): Postgres + Mailpit в Docker, `pnpm db:pull` с анонимизация; локалното приложение никога не се свързва с прод.
