# Сървърът: как е пуснат Pakto

Pakto работи на собствен VPS в Hostinger (KVM 2, Ubuntu 24.04, IP `187.7.64.36`), на `https://pakto.net`. Тук е всичко, което трябва да се знае, за да се поддържа, деплойва или вдигне отново. **При всяка нова env, cron задача или папка за файлове: обнови този файл.**

Преместването от Supabase, Resend и Vercel приключи на 06.10.2026 (историята е в git).

---

## 1. Какво тече на сървъра

Всичко е в `deploy/compose.yml` (Docker Compose, проект `deploy`), в папка `/opt/pakto` на сървъра:

```
/opt/pakto/
  .env            тайните (права 600, никога в git)
  deploy/         compose.yml, Caddyfile, deploy.sh, cron/, backup/, offsite/, postgres-init/
  db/             миграциите (dbmate)
  backups/        нощните дъмпове на базата (14 дни)
```

| Контейнер | Какво прави |
|---|---|
| `caddy` | HTTPS (Let's Encrypt, сам подновява), `www.pakto.net` → `pakto.net`, HSTS, тяло на заявка до 20 MB, без буфериране за `/api/live` (`flush_interval -1`). Единственият с публични портове (80, 443). |
| `app` | Next.js (`output: "standalone"`), образ `ghcr.io/durantula1/pakto:<sha>`, непривилегирован потребител, healthcheck `/api/health`, `TZ=Europe/Sofia`, `stop_grace_period: 30s` (писмата с `after()` да довършат). Файловете са в тома `files` (`/data/files`). |
| `postgres` | Postgres 17 с `deploy/postgresql.conf`; портът не е публикуван. Роли: `pakto_owner` (миграции) и `pakto_app` (само четене и писане, от `deploy/postgres-init/01-setup.sh`). |
| `cron` | `deploy/cron/loop.sh`, виж раздел 3. |
| `backup` | `deploy/backup/run.sh`: в 01:00 UTC дъмп на базата в `/opt/pakto/backups`, пази 14 дни. |
| `offsite` | `deploy/offsite/run.sh`: в 01:20 UTC качва дъмповете и тома с файловете в Cloudflare R2 с restic. |
| `migrate` | dbmate, само при деплой (`--profile tools`). |

Сървърът: потребител `deploy` (sudo, docker), вход само с ключ, root вход изключен, `ufw` (22, 80, 443), fail2ban, unattended-upgrades, 2 GB swap, ротация на Docker логовете (10 MB × 5).

---

## 2. Променливи на средата

На сървъра са в `/opt/pakto/.env`; `deploy/compose.yml` ги подава на контейнерите (там са и стойностите по подразбиране). Локално: `.env.local` по образеца на `.env.example`.

| Променлива | Къде | Какво е |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | build + app | `https://pakto.net`. Влиза в линковете в имейлите, клиентските линкове, пренасочванията и SEO адресите. **Задава се при build** (в `.github/workflows/deploy.yml`), защото е `NEXT_PUBLIC_`. |
| `DATABASE_URL` | app | Сглобява се в compose: `pakto_app` към контейнера `postgres`. |
| `DATABASE_SSL` | app | `false`: базата е във вътрешната Docker мрежа. По подразбиране `true` за външна база. |
| `POSTGRES_OWNER_PASSWORD`, `POSTGRES_APP_PASSWORD` | `.env` | Паролите на двете роли, генерирани на сървъра. |
| `PORTAL_LINK_SECRET` | app | Подписва клиентските линкове. **Смяната обезсилва всички изпратени линкове.** Задължителна. |
| `BETTER_AUTH_SECRET` | app | Подписва сесиите на служителите. Смяната изкарва всички служители. Локално може да липсва (извежда се от `PORTAL_LINK_SECRET`). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | app | „Продължи с Google“ при вход и регистрация. От Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application). Authorized JavaScript origin: `https://pakto.net`; Authorized redirect URI: `https://pakto.net/api/auth/callback/google` (локално и `http://localhost:3000/api/auth/callback/google`). Без двата ключа бутонът не се показва. Четат се при старт на контейнера. |
| `CRON_SECRET` | app + cron | Bearer токенът за `/api/cron/*`, поне 16 знака. |
| `CRON_DAILY_JOBS` | cron | `on` по подразбиране; `off` спира `purge-accounts` и `offer-reminders` (опашката с писма продължава). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | app | `smtp.hostinger.com`, `465`, `info@pakto.net`, паролата на кутията от hPanel → Emails. Локално: Mailpit (`127.0.0.1`, `1025`, без потребител). |
| `EMAIL_FROM` | app | `Pakto <info@pakto.net>`; трябва да е същата кутия като `SMTP_USER`, иначе Hostinger отказва писмото. |
| `EMAIL_DAILY_LIMIT` | app | `1000` (Email Starter: 1000 писма за 24 часа). При 90 % известията и напомнянията чакат; кодовете, линковете и поканите минават винаги. |
| `SUPPORT_EMAIL` | app | `info@pakto.net`: тук идват съобщенията от „Връзка с нас“ (`/contact`) със снимките. |
| `FILES_DIR` | app | `/data/files` (томът `files`); локално `.data/files`. |
| `APP_TAG` | `.env` | Кой образ тече; пише го `deploy.sh`. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | offsite | Cloudflare R2, токен „Object Read & Write“ само за bucket `pakto-backups`. |
| `RESTIC_PASSWORD` | offsite | Криптира бекъпите в R2. **Копие в password manager-а на собственика**: без нея бекъпите не се отварят. |

---

## 3. Cron задачи

Контейнерът `cron` (`deploy/cron/loop.sh`, часова зона Europe/Sofia) вика приложението вътре в мрежата с `Authorization: Bearer $CRON_SECRET`:

| Кога | Път | Какво |
|---|---|---|
| всяка минута | `/api/cron/email-outbox` | Повторни опити за писма (след 1, 5, 15, 60, 180 мин.), трие записи по-стари от 30 дни. |
| 03:00 | `/api/cron/purge-accounts` | Изтрива профили след гратисния период. |
| 07:00 | `/api/cron/offer-reminders` | Напомняния, изтичане на оферти и дневното писмо до клиентите за графика. |

Нова cron задача: ред в `loop.sh` и ред тук.

---

## 4. Деплой

**Автоматично при всеки push в `main`** (`.github/workflows/deploy.yml`), освен ако са пипнати само `docs/` и `.md` файлове:

1. Паралелно: `pnpm typecheck` + `pnpm lint` и `next build` (Turbopack, с пазен `.next/cache`).
2. `Dockerfile.prebuilt` само копира готовия `.next/standalone` в образа → `ghcr.io/durantula1/pakto:<sha>`.
3. SSH като `deploy@187.7.64.36` (по IP: `pakto.net` минава през Cloudflare, който не пренася SSH) с ключа от GitHub secret `DEPLOY_SSH_KEY`. В `authorized_keys` ключът е `restrict,command="/opt/pakto/deploy/deploy.sh"`: може да пусне само този скрипт.
4. `deploy.sh` получава `deploy/` и `db/` и краткотраен токен за GHCR. Ако има нова миграция: бекъп, после миграцията. После сменя `APP_TAG`, пуска `up -d`, рестартира `cron`, `backup` и `offsite` и чака `healthy`. При провал връща предишния образ.

Целият цикъл е около 2–3 минути; сайтът не спира, освен за секундите на смяната.

- **Връщане на стара версия:** на сървъра `sed -i "s/^APP_TAG=.*/APP_TAG=<стар sha>/" /opt/pakto/.env`, после `cd /opt/pakto/deploy && docker compose --env-file ../.env up -d app`. Старите образи стоят в GHCR.
- **Миграциите са само напред:** връща се образът, не схемата, затова всяка миграция трябва да работи и със стария код.
- **Ръчен билд на сървъра** (ако GitHub не работи): кодът в `/opt/pakto/src`, `Dockerfile` строи от изходния код.
- Команди на сървъра се пускат от `/opt/pakto/deploy` с `docker compose --env-file ../.env …`.

---

## 5. Бекъпи и възстановяване

- **Нощно:** 01:00 UTC пълен дъмп на базата (`pg_dump -Fc -Z 0`: некомпресиран, за да може restic да пази само промените), 14 дни в `/opt/pakto/backups`. 01:20 UTC restic качва `/opt/pakto/backups` и тома `files` в R2 (bucket `pakto-backups`), криптирано, с `--compression max`; пази 14 дневни, 8 седмични и 12 месечни копия.
- **Ръчно:** `docker compose --env-file ../.env exec -e BACKUP_NOW=1 backup bash /run.sh` и `docker compose --env-file ../.env exec -e OFFSITE_NOW=1 offsite sh /run.sh`.
- **Проверено на 06.10.2026:** възстановяване на дъмпа в празен Postgres (всичките таблици с еднакъв брой редове, хешовете на версиите съвпадат) и сваляне от R2 (еднакви контролни суми).

**Възстановяване на нов сървър:**
1. Docker, `/opt/pakto` със съдържанието на `deploy/` и `db/` от git и `.env` (паролите от password manager-а).
2. Свали бекъпа от R2: `docker compose --env-file ../.env run --rm --entrypoint restic -v /opt/pakto/restore:/restore offsite restore latest --target /restore` (идват `backups/` и `data/files/`).
3. `docker compose --env-file ../.env up -d postgres` (init-скриптът създава `extensions` и `pakto_app`), после `docker compose --env-file ../.env exec -T postgres pg_restore -U pakto_owner -d pakto --clean --if-exists --exit-on-error < /opt/pakto/restore/backups/pakto-<дата>.dump`.
4. Файловете: `docker run --rm -v deploy_files:/data/files -v /opt/pakto/restore/data/files:/src:ro alpine cp -a /src/. /data/files/`.
5. `docker compose --env-file ../.env up -d`, DNS към новия IP.

---

## 6. Имейли

- Излизат през `info@pakto.net` (Hostinger Email Starter, SMTP, Nodemailer в `src/lib/email/send.ts`). DNS (в Cloudflare, записите са DNS only) има MX и autodiscover/autoconfig към Hostinger, SPF, DKIM (`hostingermail-a/b/c._domainkey`) и DMARC `p=quarantine`. Ако тези записи станат Proxied (оранжеви), пощата и подписите спират.
- Всяко писмо оставя ред в `app.email_outbox` (вид, получател, статус, грешка). Текстът се пази само докато писмото чака повторен опит; кодовете и личните линкове не се пазят. Записите се трият след 30 дни.
- Известията, напомнянията, дневното писмо и отговорите на въпроси се опитват отново при временна грешка. Кодовете, линковете, поканите, изпратената оферта, разписката и контактната форма се пращат веднага и човекът вижда причината при грешка.
- Колко са излезли за 24 часа: `select count(*) from app.email_outbox where status = 'sent' and created_at > now() - interval '24 hours';`. Неизпратени: `status in ('queued', 'failed')`.

---

## 7. Вход, файлове, live

- **Служители:** Better Auth (`src/lib/auth/server.ts`), таблици `app.auth_*`, bcrypt пароли. Лимити за опити в паметта на процеса (`src/lib/auth/limits.ts`), по IP от `X-Forwarded-For`, който подава Caddy.
- **Файлове:** под `FILES_DIR/<папка>/<път>` (`src/lib/storage/`): `change-attachments` (снимки и PDF към оферти, през `/api/attachments/[id]` след проверка на достъпа), `decision-signatures` (подписи на клиенти), `organization-logos` (публични през `/api/logos/...`, кеш за година). Качването е с подписан билет за 10 минути към `PUT /api/uploads`.
- **Live:** тригерът на `app.staff_notifications` прави `pg_notify('staff_refresh')`, един `LISTEN` на процес (`src/lib/live/hub.ts`), `/api/live` го праща като server-sent events. Порталът на клиента пита `/api/portal/pulse` на интервали.
- **Пренасочванията от route handlers** се строят от `NEXT_PUBLIC_APP_URL` (`appUrl()`), не от `request.url`: зад Caddy адресът на заявката е този на контейнера (`0.0.0.0:3000`).

---

## 8. Сигурност

- Хедъри от `next.config.ts`: Content-Security-Policy на страниците (всичко от `'self'`, без външни ресурси), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`; порталът е `private, no-store` и `no-referrer`. HSTS (с `includeSubDomains`, без `preload`; поддомейните са проверени на 09.10.2026) идва от Caddy.
- Лимити в приложението (в паметта, нулират се при рестарт): вход, регистрация, писма за парола, кодове, съобщения, клиентски линкове (`/access/[token]`: до 20 нови сесии на IP за 10 мин.; повторно отваряне на същото устройство ползва старата сесия), „Изпрати ми нови линкове“, `/contact`.
- Better Auth: HTTP пътищата, които браузърът не ползва (`/sign-up/email`, `/sign-in/email`, `/request-password-reset`, `/send-verification-email` и т.н.), връщат 404 (`disabledPaths` в `src/lib/auth/server.ts`), за да не заобикалят лимитите. Server actions викат `auth.api` директно. Отворени остават линковете от писмата и `/callback/google`.
- `deploy.sh` рестартира Caddy, когато Caddyfile се е сменил (`/opt/pakto/.caddyfile.sha256`): новият файл не се вижда през bind mount-а без рестарт.

### Cloudflare

От 06.10.2026 Cloudflare (безплатен план, акаунтът на собственика) държи DNS-а на `pakto.net` и `pakto.io` и стои пред сайта. Домейните остават регистрирани в Hostinger; там са сменени само nameservers на `april.ns.cloudflare.com` и `troy.ns.cloudflare.com`.

- **DNS на `pakto.net`:** `A @ → 187.7.64.36` и `CNAME www → pakto.net` са Proxied (оранжево); всички пощенски записи са DNS only (виж „Имейли“). Нов запис за сайта: Proxied; за поща или друга услуга: DNS only.
- **SSH не минава през Cloudflare** (проксито пренася само HTTP/HTTPS): деплоят, `scripts/db-pull.sh` и ръчният вход ползват IP-то `187.7.64.36`.
- **Настройки в dashboard-а:** SSL/TLS „Automatic“ (избира Full (strict), Caddy има валиден сертификат; никога Flexible: зацикля пренасочването към https); Bot Fight Mode изключен (на 07.10.2026 е „0/1 running“ и го оставяме така, виж по-долу); AI crawl политиките по подразбиране (Allow), Bot Preference Sync включен (добавя редове в началото на robots.txt). Leaked credentials mitigation не е включен: безплатният план има едно rate limiting правило и то е за нас.
- **Bot Fight Mode** (изключен) спира автоматизирани клиенти без изключение (на безплатния план не може да се добави). Ако се включи, външен uptime монитор към `https://pakto.net/api/health` може да започне да вижда „down“; вътрешните неща (cron, бекъпи, health check на контейнера) не минават през Cloudflare.
- **Реалният IP:** Caddy вярва на `CF-Connecting-IP` само от IP диапазоните на Cloudflare (`trusted_proxies` в `deploy/Caddyfile`; списъкът е от https://www.cloudflare.com/ips/, проверявай го веднъж годишно) и праща на приложението `X-Forwarded-For` с един адрес. Пряка заявка до сървъра запазва собствения си адрес, затова фалшив header не сменя IP-то за лимитите.
- **При атака:** Overview на `pakto.net` → Under Attack Mode (всеки посетител минава кратка проверка). След атаката се изключва.
- **Връщане без Cloudflare:** в Hostinger nameservers на `pakto.net` обратно на `horizon.dns-parking.com` и `orbit.dns-parking.com` (на `pakto.io`: `aster` и `helios.dns-parking.com`); зоната в Hostinger още има старите записи, но DMARC там е `p=none` и трябва да се вдигне. Ако firewall-ът по-долу е включен, първо той се изключва, иначе сайтът спира.
- **Firewall на VPS-а** (от 07.10.2026; hPanel → VPS → Security → Firewall, конфигурация `pakto-cloudflare`; Docker заобикаля `ufw`, затова е firewall-ът на Hostinger): Accept TCP 22 от всички (деплоят идва от различни адреси на GitHub), TCP 80 от всички, TCP 443 само от 15-те IPv4 диапазона на Cloudflare, накрая Drop за всичко останало. Порт 80 е отворен, защото Let's Encrypt проверява сървъра оттам: Caddy подновява сертификата само с HTTP challenge (`cert_issuer acme { disable_tlsalpn_challenge }` в `deploy/Caddyfile`). Пряка заявка към IP-то на 443 не минава. Ако Cloudflare добави диапазон, той трябва да влезе и тук, и в `trusted_proxies`. **Преди връщане без Cloudflare firewall-ът се изключва.**
- **Rate limiting** (Security → Security rules на `pakto.net`, правило `pakto-auth-limit`, единственото на безплатния план): `starts_with` на пътя за `/access/`, `/sign-` и `/api/auth/`, по IP, над 20 заявки за 10 секунди → Block за 10 секунди (отговор 429). Не покрива целия `/api/`: `/api/live`, `/api/uploads` и `/api/portal/pulse` законно пращат много заявки. Проверено на 07.10.2026: след 20-ата заявка идва 429, началната страница не се засяга.
- **pakto.io:** само пренасочва. `@` и `www` са A `192.0.2.1` (фиктивен адрес, Proxied), Redirect Rule „All incoming requests“ → `concat("https://pakto.net", http.request.uri.path)`, 301, със query string. Не стига до сървъра. Няма поща: SPF `v=spf1 -all`, DMARC `p=reject`, за да не може да се праща от името на домейна.

---

## 9. Локална разработка

```bash
pnpm db:up          # Postgres 17 + Mailpit (http://localhost:8025)
pnpm db:migrate     # миграциите
pnpm db:seed        # демо фирма и оферта; вход demo@pakto.local / pakto-dev-2026
pnpm db:pull        # или анонимизирано копие на базата от сървъра (-- --files за файловете)
pnpm dev
```

Нова миграция: `pnpm db:new <име>` в `db/migrations/` (dbmate), заедно с промяната в `src/db/schema/index.ts`. На сървъра се прилага сама при деплой.

---

## 10. Проверка след голяма промяна

- [ ] Регистрация → писмо за потвърждение → вход.
- [ ] Оферта със снимка → изпращане → имейл → клиентският линк отваря портала → код → одобрение → разписка с PDF.
- [ ] В „Доказателство за решението“ IP-то е реалното, не адрес от Docker мрежата.
- [ ] Live: въпрос от клиента идва при фирмата без презареждане.
- [ ] `/api/cron/*` с грешен ключ връща 401.
- [ ] `/contact` със снимка стига до `SUPPORT_EMAIL`.

### Преди официалното пускане

Отворените точки от завършените планове (миграцията, началната страница), събрани тук на 07.10.2026:

- [ ] Чисти бази на сървъра и локално, после QA по `docs/qa-test-plan.md`: раздели 1–8 локално, раздел 9 на pakto.net.
- [ ] Имейлите (код, известие, напомняне, дайджест, контактна форма) в mail-tester.com: цел поне 9/10.
- [ ] Профил: смяна на имейл и парола, покана в екипа, изтриване на профил, изход от всички устройства.
- [ ] Външен монитор към `https://pakto.net/api/health` (Bot Fight Mode е изключен, затова не го спира).
- [ ] Старият Supabase проект се трие след 30-те дни пауза (около 06.11.2026).
- [ ] Начална страница: неразделими интервали между число и единица (`450 €`); по-кратка анимация в hero (P2).
- [ ] Правните текстове (`/privacy`, `/terms`) с данните на фирмата и преглед от юрист, щом има регистрирана фирма.

---

## Дневник

- **06.10.2026**: Cloudflare пред `pakto.net` (и `pakto.io`, което пренасочва), DMARC `p=quarantine`, деплоят по SSH към IP-то. Security проверка: Next 16.3.6, лимити за клиентските линкове и „нови линкове“, затворени HTTP пътища на Better Auth, Caddy с реалния IP. Вход с Google (`GOOGLE_CLIENT_ID/SECRET`). Lighthouse: текстов корал `--primary-ink`, `/contact` се индексира.
- **06.10.2026**: махнат старият модел „паспорт“ от MadeFlow: 19 празни таблици, 12 типа, 2 функции и 6 колони (`20261006120000_drop_legacy_madeflow.sql`, необратима: връщане само от бекъп), папката `order-files` от списъка за файлове; `purge_organization` вече не ги чисти.
- **06.10.2026**: преместването е завършено. Сървърът, деплоят, бекъпите (локални и R2) и имейлите са описани по-горе; Supabase, Resend и Vercel са махнати от кода (`@supabase/supabase-js`, `resend`, `drizzle-kit`, `vercel.json`, `supabase/`, `drizzle/`, `src/instrumentation.ts`). Базата на сървъра е започната на чисто (данните в Supabase бяха само тестови). Добавени CSP и `db/seed.sql`. Поправени: пренасочвания към `0.0.0.0:3000`, контактната форма (искаше `RESEND_API_KEY`), `db:pull` (историята на миграциите и `--files`).
- **05.10.2026**: имейли през SMTP с опашка, файлове на диска, Better Auth, live през `LISTEN/NOTIFY`, собствен Postgres.
- По-старите записи (Vercel/Supabase периода) са в историята на git.

## robots.txt и Cloudflare

Приложението сервира собствен `robots.txt` (`src/app/robots.ts`: `Disallow` за `/app`, `/portal`, `/access`, `/api`, `/onboarding`, `/auth`, `/join`). Ако в Cloudflare е включено „Manage your robots.txt“ / управляваният robots.txt (Security → Settings, или AI Crawl Control), той слага своя група `User-agent: *` с `Allow: /` преди нашата и някои ботове четат само първата група. Изключи го от таблото на Cloudflare. Това не може да се направи от кода.
