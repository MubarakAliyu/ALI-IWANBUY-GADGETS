import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * The screenshots the pitch references (Part I). Not a test — a capture run, which is why it lives in its
 * own Playwright project and is ignored by `pnpm test:e2e`:
 *
 *   pnpm screenshots
 *
 * They go into `docs/screenshots/` at two widths, because half of the pitch's point is that this works on a
 * phone. It uses the seeded demo accounts and changes nothing — the one place it would (the PIN dialog) is
 * photographed and then cancelled.
 */

const OUT = path.resolve(process.cwd(), "..", "docs", "screenshots");

const ADMIN_PASSWORD = "Owner12345";
const CUSTOMER = { email: "amina@example.com", password: "Customer123" };

test.describe.configure({ mode: "serial" });

async function shot(page: Page, name: string, suffix: string) {
  await mkdir(OUT, { recursive: true });
  // `animations: "disabled"` stops a chart mid-sweep from being what ends up in the deck.
  await page.screenshot({
    path: path.join(OUT, `${name}-${suffix}.png`),
    fullPage: false,
    animations: "disabled",
  });
}

async function signInCustomer(page: Page) {
  await page.goto("/login");
  await expect(async () => {
    await page.getByRole("textbox", { name: "Email address" }).fill(CUSTOMER.email);
    await page.getByLabel("Password", { exact: true }).fill(CUSTOMER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("account-menu")).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 40_000 });
}

async function signInOwner(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill("owner@aliiwanbuy.com");
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 60_000 });
}

for (const [suffix, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
] as const) {
  test(`storefront — ${suffix}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(viewport);

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "home", suffix);

    await page.goto("/shop?category=phones&sort=price-asc");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "shop-filters", suffix);

    await page.goto("/product/samsung-galaxy-s23-ultra");
    await expect(page.getByTestId("add-to-cart")).toBeVisible();
    await shot(page, "product", suffix);

    await page.getByTestId("add-to-cart").click();
    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "cart", suffix);

    await signInCustomer(page);
    await page.goto("/account/orders");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "account-orders", suffix);

    await page.goto("/account/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "account-settings", suffix);
  });

  test(`dashboard — ${suffix}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(viewport);

    await signInOwner(page);
    // Let the charts finish drawing before they are photographed.
    await page.waitForTimeout(1_500);
    await shot(page, "admin-overview", suffix);

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
    await shot(page, "admin-orders", suffix);

    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
    await shot(page, "admin-products", suffix);

    await page.goto("/admin/audit");
    await expect(page.getByRole("heading", { name: "Audit trail" })).toBeVisible();
    await shot(page, "admin-audit", suffix);

    // The PIN dialog, on an order that is actually awaiting confirmation. Cancelled afterwards — this run
    // photographs the shop, it does not change it.
    await page.goto("/admin/payments");
    const confirm = page.getByRole("button", { name: "Confirm payment" }).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByLabel("Your payment PIN").fill("84");
      await shot(page, "admin-pin-modal", suffix);
      await page.getByRole("button", { name: "Cancel" }).click();
    }
    await shot(page, "admin-payments", suffix);
  });
}
