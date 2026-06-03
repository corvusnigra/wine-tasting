# Self-host в Docker — план (отложено, реализуем после тестов)

> Цель: перенести приложение на локальный/RU-сервер, убрав зависимость от
> Supabase Cloud EU и QUIC-столлов к Франкфурту (`ERR_QUIC_PROTOCOL_ERROR`).
> Решение: весь стек (Next-приложение + самохостинг Supabase) в Docker.
>
> Договорённости на момент записи (2026-06-02):
> - Самохостить **и** Supabase, **и** приложение.
> - Сначала валидируем локально на маке (без телефонов/TLS), потом боевой хост.

## Поверхность приложения (что должен уметь self-host)
- **Auth (GoTrue):** анонимный вход (вход по имени) + magic-link OTP (email).
- **PostgREST:** весь доступ к данным.
- **Realtime:** живой прогресс вечера (`SessionLiveRefresher`), публикация в миграции `…000003_realtime.sql`.
- **Storage:** фото этикеток, bucket + политики в миграции `…000007_wine_photos.sql`.
- **Postgres + RLS:** 7 миграций в `supabase/migrations/`, каталог public-read для `anon`.
- Middleware `proxy.ts` рефрешит сессию (cookies).

## Фаза 1 — контейнеризовать приложение (быстро, ~30 мин)
Доказать, что Next собирается и крутится в Docker против уже знакомого
CLI-стека (`supabase start`, порты +100).

Файлы:
1. `next.config.ts` → добавить `output: "standalone"`.
2. `Dockerfile` (multi-stage, pnpm):
   - `deps`: `corepack enable`, `pnpm i --frozen-lockfile`.
   - `builder`: копировать исходники, `pnpm build`. **build-args** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (вшиваются в бандл!).
   - `runner`: `node:22-alpine`, копировать `.next/standalone`, `.next/static`, `public`; `CMD ["node","server.js"]`; `EXPOSE 3000`.
3. `.dockerignore`: `node_modules`, `.next`, `test-results`, `playwright-report`, `.env*`, `.git`, `.vercel`, `.claude`.
4. (опц.) `docker-compose.dev.yml` с одним сервисом `web`, env → `http://host.docker.internal:54421` (CLI Supabase на хосте).

⚠️ **NEXT_PUBLIC_* вшиваются при сборке.** Браузер на телефоне должен достучаться
до Supabase по адресу сервера → для dev URL = `http://localhost:8000` (Kong) или
`http://host.docker.internal:54421` (CLI). При смене хоста — пересборка образа
(или вынести в runtime-env, +работа, см. «Открытые вопросы»).

## Фаза 2 — самохостинг Supabase (основное)
Официальный стек `supabase/docker` в том же `docker-compose.yml`.

Сервисы: `db` (Postgres) · `auth` (GoTrue) · `rest` (PostgREST) · `realtime` ·
`storage` + `imgproxy` · `kong` (API-шлюз = `SUPABASE_URL`, :8000) · `meta` ·
`studio` · (vector/analytics можно выключить).

Шаги:
1. Взять `docker-compose.yml` + `.env.example` из репозитория `supabase/supabase`
   (`/docker`). Положить в `deploy/` (или адаптировать в корневой compose).
2. Сгенерить секреты: `POSTGRES_PASSWORD`, `JWT_SECRET` (32+ симв.), из него —
   `ANON_KEY` и `SERVICE_ROLE_KEY` (legacy JWT; генератор — supabase.com/docs/guides/self-hosting/docker).
   ⚠️ На self-host **нет** `sb_publishable/sb_secret` — в env приложения кладём
   именно JWT `ANON_KEY`. `supabase-js` его принимает.
3. **Включить анонимный вход:** `GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED=true`
   (без него вход по имени не работает).
4. `SITE_URL` / `ADDITIONAL_REDIRECT_URLS` под адрес сервера.
5. **Миграции:** смонтировать `supabase/migrations/*.sql` в `db` контейнер в
   `/docker-entrypoint-initdb.d/` (выполнятся на чистом томе по порядку имён).
   Альтернатива — one-shot job `supabase db push`. Bucket фото и realtime-публикация
   приедут вместе с миграциями 3 и 7.
6. **Seed каталога:** прогнать `pnpm seed` против self-host (`--env-file` с
   self-host URL+SERVICE_ROLE_KEY). Демо-вечер — опц., скриптом
   `supabase/scripts/seed-demo-evening.ts` (поправить GROUP_ID).
7. Подключить `web` к стеку: `depends_on: [kong, db]`, build-arg URL = адрес Kong.
8. SMTP для magic-link: для dev — встроенный inbucket/без писем (хватает анонимного
   входа); для прода — реальный SMTP в GoTrue env.

Проверка: `docker compose up` → открыть `http://localhost:3000` → пройти полный цикл
(можно прогнать наш e2e против него: `E2E_PORT`/`baseURL` на контейнер).

## Готчи
- **PWA service worker + камера (фото этикеток)** требуют **secure context** —
  на `http://<LAN-IP>` НЕ работают. На `localhost` ок. Для телефонов/LAN нужен
  **HTTPS**: `mkcert` (локальный CA) или `caddy`/`traefik` с авто-TLS. Отложено.
- Образ привязан к build-time `NEXT_PUBLIC_*`. На сервере пересобрать с его хостом.
- Realtime требует, чтобы таблицы были в публикации `supabase_realtime` (миграция 3) — ок.
- `max_rows`/CORS Kong — проверить, что `anon` читает каталог (как в config.toml).

## Открытые вопросы (решить перед боевым хостом)
- **Где хост:** LAN-бокс в одной Wi-Fi (нужен локальный TLS) vs VPS в РФ + домен
  (Caddy + Let’s Encrypt). Сейчас выбран «пока локально (dev)».
- **Runtime-env вместо build-time** для `NEXT_PUBLIC_SUPABASE_URL` — чтобы один
  образ работал на любом хосте без пересборки (паттерн: подстановка плейсхолдера
  на старте контейнера). Стоит сделать до прод-хостинга.
- **Бэкапы Postgres-тома** на сервере.
- **Перенос данных** с Cloud EU (если нужно сохранить текущие группы/вечера) —
  `pg_dump` из облака → restore в self-host.

## Затронутые файлы (когда будем делать)
- `next.config.ts` (output standalone), `Dockerfile`, `.dockerignore`,
  `docker-compose.yml`, `deploy/.env`, монтирование `supabase/migrations/`.
- Без изменений в коде приложения (только env/сборка).
