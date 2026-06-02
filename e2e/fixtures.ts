import { test as base, expect } from "@playwright/test";

/**
 * Shared fixtures. The age gate (components/layout/AgeGate.tsx) blocks the
 * whole app behind an 18+ confirmation stored in localStorage + cookie.
 * We pre-confirm it via an init script so every test starts unblocked.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem("sommelier.ageConfirmed", "true");
      } catch {
        /* localStorage may be unavailable before first paint — cookie covers it */
      }
      document.cookie = "age_confirmed=true; path=/; SameSite=Lax";
    });
    await use(context);
  },
});

export { expect };
