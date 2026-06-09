import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

function rx(s: string) {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

async function addWine(page: Page, name: string) {
  await page.getByRole("button", { name: rx("Бутылка, которой нет в базе") }).click();
  const d = page.getByRole("dialog");
  await d.getByPlaceholder(/Barolo, Brut Reserve/).fill(name);
  await d.getByRole("button", { name: "Сохранить" }).click();
  await d.waitFor({ state: "hidden" });
}

/**
 * Logging out must actually drop the session: after "Выйти" the landing
 * page (/) must stay on / for a logged-out visitor (a logged-in one is
 * redirected to their group).
 */
test("выход из-под участника действительно разлогинивает", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Аня").fill("Выходящий");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL(/\/groups\/[0-9a-f-]+/, { timeout: 30_000 });

  // Open the profile menu and sign out.
  await page.getByRole("button", { name: "Меню профиля" }).click();
  await page.getByRole("menuitem", { name: "Выйти" }).click();

  // Should land on the public landing, NOT be bounced back to a group.
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 30_000 });

  // Re-visit / to prove the session is gone (a live session redirects to /groups).
  await page.goto("/");
  await expect(page).toHaveURL((u) => new URL(u).pathname === "/");
  await expect(page.getByRole("link", { name: "Войти" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Меню профиля" })).toHaveCount(0);
});

test("выход заблокирован, когда начал оценивать, но не закончил", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Аня").fill("Недооценщик");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL(/\/groups\/[0-9a-f-]+/, { timeout: 30_000 });

  // Evening with two wines.
  await page.goto("/sessions/new");
  await page.getByPlaceholder("Тосканцы 14 мая").fill("Гейт-вечер");
  await addWine(page, "Гейт Вино 1");
  await addWine(page, "Гейт Вино 2");
  await page.getByRole("button", { name: "Начать вечер" }).click();
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const sessionId = page.url().split("/sessions/")[1];

  // Rate ONLY the first wine — now started (1/2) but unfinished.
  await page.getByRole("link", { name: rx("Гейт Вино 1") }).click();
  await page.waitForURL(/\/wine\//);
  await page.getByRole("button", { name: "интенсивный", exact: true }).click();
  await page.getByRole("button", { name: /Дальше/ }).click();
  await page.getByRole("button", { name: "интенсивный", exact: true }).click();
  await page.getByRole("button", { name: /Дальше/ }).click();
  await page
    .locator("fieldset", { has: page.getByText("Сладость", { exact: true }) })
    .getByRole("button", { name: "почти сухое", exact: true })
    .click();
  await page.getByRole("button", { name: /Дальше/ }).click();
  await page.getByRole("button", { name: "4 звёзд из 5", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить оценку" }).click();
  await page.waitForURL(new RegExp(`/sessions/${sessionId}$`));

  // Attempt to leave — blocked, not signed out.
  await page.getByRole("button", { name: "Меню профиля" }).click();
  await page.getByRole("menuitem", { name: "Выйти" }).click();
  await expect(page.getByText(/Сначала оцените все вина/)).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/sessions\//);
  await expect(page.getByRole("button", { name: "Меню профиля" })).toBeVisible();
});
