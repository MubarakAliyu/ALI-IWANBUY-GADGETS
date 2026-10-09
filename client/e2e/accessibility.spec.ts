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
