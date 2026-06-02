import { test, expect } from "./fixtures";

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
