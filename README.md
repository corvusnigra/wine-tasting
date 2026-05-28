# Sommelier Night

Дневник дегустаций для своей компании. Один человек создаёт «вечер», 3-6 друзей
параллельно ставят структурированные WSET-оценки со своих телефонов, после
раскрытия — side-by-side таблица, средние, аутлаеры. История вечеров.

**Стек**: Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind 4 + Supabase EU + Realtime + next-intl + Vitest.

## Локальный запуск

Требования: Node 20+, pnpm 10+, Docker.

```bash
pnpm install
pnpm dlx supabase@latest start        # Postgres + Auth + Realtime + Studio
cp .env.local.example .env.local      # заполнить URL/keys из вывода supabase start
pnpm seed                             # справочники: сорта, регионы, производители, дескрипторы
pnpm dev                              # http://localhost:3000
```

Локальные URL'ы (порты сдвинуты на +100 от дефолтных, чтобы не конфликтовать с другими supabase-проектами):

| Сервис | URL |
|---|---|
| Приложение | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54421 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54422/postgres |
| Studio | http://127.0.0.1:54423 |
| Mailpit (просмотр magic-link писем) | http://127.0.0.1:54424 |

## Команды

```bash
pnpm dev                  # dev-сервер
pnpm build                # production-билд + tsc
pnpm test                 # vitest unit-тесты
pnpm test:watch           # vitest в watch
pnpm seed                 # перенакачать справочники
pnpm supabase:types       # регенерировать lib/supabase/types.ts из схемы
pnpm lint                 # eslint
```

## Структура

```
/app                   # Next.js App Router (страницы, route handlers)
/components            # UI: layout, wine, session, tasting, search
/lib                   # supabase clients, search, tasting (scales, vocabulary, schemas), utils, groups
/messages              # i18n: ru.json (источник), en.json (стаб для v2)
/supabase
  /migrations          # 3 миграции: init+RLS, search, realtime publication
  /scripts/seed.ts     # idempotent upsert справочников
  /scripts/sources/*.json
/tests/unit            # vitest
```

## Текущий статус MVP

### Готово end-to-end
- Лендинг + 18+ заглушка + dark mode + кириллические шрифты (Cormorant Garamond + Inter)
- Magic-link auth (через Mailpit локально) + гостевой вход (signInAnonymously)
- Auto-create группы «Моя компания» на первом логине
- Создание вечера: title, дата, флайт 1-N вин с автокомплитом и inline-созданием
- WSET Standard tasting card — 4 свайп-шага, debounced autosave, 5★/20pt-переключатель
- Realtime: подписка на `tasting_notes` + polling-fallback при отказе канала
- Раскрытие: side-by-side таблица, средние, аутлаеры |z|>1, бейджи 🏆🎲🎯
- Архив сессий, карточка вина с историей, глобальный поиск (FTS + trigram)
- 12 unit-тестов: scales, invite-code, search-normalize

### Известные ограничения
- Английский UI — только стаб в `messages/en.json`, заполняется в v2.
- Аутентификация по email — magic link; Telegram-логин в v1.
- Колесо ароматов — chip-list в MVP, полное колесо Энн Ноубл в v1.
- Фото бутылок — Storage готов, UI в v1.

## Развёртывание

Не настроено в текущем коммите. По плану:
- Vercel (Hobby tier) + Cloudflare proxy перед `*.vercel.app` + домен в зоне `.ru`/`.app`
- Supabase EU (Frankfurt) staging/prod
- Подробности — см. `/Users/moi/.claude/plans/sommelier-night-ticklish-abelson.md`

## Юридический минимум

- 18+ заглушка при первом визите, согласие в cookie+localStorage на 30 дней
- Бейдж 18+ в шапке и футере
- Дисклеймер в футере: «Сайт носит информационный характер … Чрезмерное употребление алкоголя вредит вашему здоровью.»
- Без кнопок «купить», без партнёрок, без ссылок на ритейлеров
