/**
 * One-off PROD smoke check: guest (name-only) login flow.
 * Run: node e2e/_prod-guest-check.mjs
 * Not part of the test suite — hits the live site. Prints the created
 * guest user id so it can be cleaned up afterwards.
 */
import { chromium } from "@playwright/test";

const BASE = "https://wine-tasting-seven.vercel.app";
const GUEST_NAME = "Тест-Гость (smoke)";
const GROUP_ID = "fa970a99-8ca3-40c2-8e88-b996f845a866";

const browser = await chromium.launch();
const context = await browser.newContext();
await context.addInitScript(() => {
  try {
    window.localStorage.setItem("sommelier.ageConfirmed", "true");
  } catch {}
  document.cookie = "age_confirmed=true; path=/; SameSite=Lax";
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);

const fail = async (msg) => {
  console.error(`FAIL: ${msg} (url: ${page.url()})`);
  await page.screenshot({ path: "e2e/_prod-guest-check-fail.png", fullPage: true });
  await browser.close();
  process.exit(1);
};

try {
  // 1. Root shows the landing for a fresh visitor
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const loginLink = page.locator('a[href="/login"]');
  await loginLink.waitFor({ state: "visible" });

  // 2. Go to /login, enter a name
  await loginLink.click();
  await page.waitForURL("**/login");
  await page.getByPlaceholder("Аня").fill(GUEST_NAME);
  await page.getByRole("button", { name: "Войти" }).click();

  // 3. Anonymous sign-in + bootstrap → redirect into the shared group
  await page.waitForURL(`**/groups/${GROUP_ID}`, { timeout: 45_000 });

  // 4. The evening is visible to the guest
  await page.getByText("Белые портвейны", { exact: false }).first().waitFor();

  // 5. Reload — returning guest must land in the group again, no name prompt
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`**/groups/${GROUP_ID}`, { timeout: 45_000 });

  // Extract guest user id from the supabase auth token for cleanup
  const userId = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("sb-") && k.endsWith("-auth-token")) {
        try {
          return JSON.parse(localStorage.getItem(k)).user?.id ?? null;
        } catch {}
      }
    }
    return null;
  });

  console.log("PASS: guest login + shared-group bootstrap + remember work on prod");
  console.log(`guest_user_id=${userId}`);
} catch (e) {
  await fail(e.message);
}
await browser.close();
