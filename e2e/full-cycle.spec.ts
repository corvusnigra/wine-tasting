import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Full happy-path: anonymous entry → create an evening with 3 wines →
 * blind-rate every wine → reveal → assert the highest-scored wine wins.
 *
 * Runs against the LOCAL Supabase stack. Wines are created via the
 * "своё вино" dialog so the test never depends on catalogue search content.
 */

const TASTER = "Е2Е Дегустатор";

// name → stars (5★=100, 4★=80, 3★=60 after normalize) — Каберне must win.
const FLIGHT = [
  { name: "Каберне Совиньон Тест", stars: 5 },
  { name: "Мерло Тест", stars: 3 },
  { name: "Сира Тест", stars: 4 },
] as const;

const WINNER = FLIGHT[0].name;

function rx(s: string) {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

async function login(page: Page, name: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Аня").fill(name);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  // "/" redirects to the freshly bootstrapped group once membership exists.
  await page.waitForURL(/\/groups\/[0-9a-f-]+/, { timeout: 30_000 });
}

async function addCustomWine(page: Page, name: string) {
  await page
    .getByRole("button", { name: rx("Бутылка, которой нет в базе") })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder(/Barolo, Brut Reserve/).fill(name);
  await dialog.getByRole("button", { name: "Сохранить" }).click();
  await expect(dialog).toBeHidden();
}

async function createEvening(page: Page): Promise<string> {
  await page.goto("/sessions/new");
  await page.getByPlaceholder("Тосканцы 14 мая").fill("Е2Е Вечер");
  for (const wine of FLIGHT) {
    await addCustomWine(page, wine.name);
  }
  await page.getByRole("button", { name: "Начать вечер" }).click();
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const id = page.url().split("/sessions/")[1];
  expect(id).toBeTruthy();
  return id;
}

async function rateWine(page: Page, sessionId: string, name: string, stars: number) {
  await page.getByRole("link", { name: rx(name) }).click();
  await page.waitForURL(/\/wine\//);

  // i. Внешний вид — colour intensity
  await page.getByRole("button", { name: "средний", exact: true }).click();
  await page.getByRole("button", { name: /Дальше/ }).click();

  // ii. Аромат — nose intensity
  await page.getByRole("button", { name: "средний", exact: true }).click();
  await page.getByRole("button", { name: /Дальше/ }).click();

  // iii. Вкус — sweetness (one slider is enough to make the note real)
  await page.getByRole("button", { name: "сухое", exact: true }).click();
  await page.getByRole("button", { name: /Дальше/ }).click();

  // iv. Заключение — score on the 5-star scale, then submit
  await page.getByRole("button", { name: `${stars} звёзд из 5`, exact: true }).click();
  await page.getByRole("button", { name: "Сохранить оценку" }).click();

  // Anchor to end — the wine URL we're leaving also contains `/sessions/{id}`.
  await page.waitForURL(new RegExp(`/sessions/${sessionId}$`));
  await expect(page.getByRole("link", { name: rx(name) })).toContainText("вы оценили");
}

test("полный цикл: вход → вечер из 3 вин → оценка → раскрытие победителя", async ({
  page,
}) => {
  await login(page, TASTER);

  const sessionId = await createEvening(page);

  // Every wine present in the flight before rating.
  for (const wine of FLIGHT) {
    await expect(page.getByRole("link", { name: rx(wine.name) })).toBeVisible();
  }

  for (const wine of FLIGHT) {
    await rateWine(page, sessionId, wine.name, wine.stars);
  }

  // All rated → host can reveal.
  await expect(
    page.getByText("Все оценки готовы · ждём остальных")
  ).toBeVisible();
  const reveal = page.getByRole("button", { name: "Раскрыть результаты" });
  await expect(reveal).toBeEnabled({ timeout: 15_000 });
  await reveal.click();

  await page.waitForURL(/\/reveal$/, { timeout: 30_000 });

  // Winner section names the 5-star wine and crowns it 1st of 3.
  const winnerSection = page.locator("section", {
    has: page.getByText("Победитель вечера"),
  });
  await expect(winnerSection.getByText(WINNER)).toBeVisible();
  await expect(winnerSection.getByText("место 1 из 3")).toBeVisible();

  // The other two wines are revealed too.
  await expect(page.getByText("Мерло Тест")).toBeVisible();
  await expect(page.getByText("Сира Тест")).toBeVisible();

  // Back on the evening page everyone gets a "results are out" banner that
  // links to the reveal — guests have no other way in (no host button).
  await page.goto(`/sessions/${sessionId}`);
  const revealBanner = page.getByRole("link", { name: /Результаты раскрыты/ });
  await expect(revealBanner).toBeVisible();
  await revealBanner.click();
  await page.waitForURL(/\/reveal$/);
});
