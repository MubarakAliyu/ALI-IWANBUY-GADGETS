import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * WCAG 2.1 AA on the pages a customer actually passes through (overview §12). Serious and critical violations
 * fail the build; nothing is excluded.
 */
const PAGES = [
  { name: "home", path: "/" },
  { name: "shop", path: "/shop" },
  { name: "product", path: "/product/apple-iphone-15" },
  { name: "cart", path: "/cart" },
  { name: "login", path: "/login" },
  { name: "register", path: "/register" },
];

for (const page of PAGES) {
  test(`${page.name} has no serious or critical accessibility violations`, async ({ page: browserPage }) => {
    await browserPage.goto(page.path);
    // Wait for the page's own heading rather than for the network to go quiet: Next keeps prefetching the
    // links in view, so a listing page never reaches `networkidle`.
    await expect(browserPage.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page: browserPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(
      serious.map(
        (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`,
      ),
    ).toEqual([]);
  });
}

/**
 * The signed-in pages need an account, so they get one of their own rather than depending on another test.
 */
const SIGNED_IN_PAGES = [
  { name: "checkout", path: "/checkout" },
  { name: "account settings", path: "/account/settings" },
  { name: "account orders", path: "/account/orders" },
];

for (const target of SIGNED_IN_PAGES) {
  test(`${target.name} has no serious or critical accessibility violations`, async ({ page }) => {
    const email = `axe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

    // Something in the cart, so checkout has a form to render rather than its empty state.
    await page.goto("/product/oraimo-freepods-4");
    await page.getByTestId("add-to-cart").click();

    await page.goto("/register");

    // Tick the terms box first: it is the form's own proof that React has hydrated and is listening.
    const terms = page.getByRole("checkbox", { name: /I accept/ });
    await expect(async () => {
      if ((await terms.getAttribute("aria-checked")) !== "true") {
        await terms.click();
      }
      await expect(terms).toHaveAttribute("aria-checked", "true", { timeout: 500 });
    }).toPass({ timeout: 15_000 });

    await page.getByRole("textbox", { name: "First name" }).fill("Axe");
    await page.getByRole("textbox", { name: "Last name" }).fill("Tester");
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("Password123");
    await page.getByLabel("Confirm password").fill("Password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).not.toHaveURL(/\/register/, { timeout: 15_000 });
    await expect(page.getByTestId("account-menu")).toHaveAccessibleName(/Account menu for/, {
      timeout: 15_000,
    });

    await page.goto(target.path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(
      serious.map(
        (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`,
      ),
    ).toEqual([]);
  });
}
