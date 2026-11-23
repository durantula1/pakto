import { expect, test } from "@playwright/test";

import { markWhatsNewSeen, resetOrg, signIn } from "./support/helpers";

test("менюто отляво се събира на лаптоп без скрол", async ({ page }) => {
  resetOrg();
  markWhatsNewSeen();
  await page.setViewportSize({ width: 1280, height: 720 });
  await signIn(page);
  const overflow = await page.evaluate(() => {
    const nav = document.querySelector("nav");
    const aside = nav?.closest("aside") ?? nav?.parentElement;
    return aside ? aside.scrollHeight - aside.clientHeight : -1;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});
