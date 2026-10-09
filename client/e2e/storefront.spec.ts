import { expect, test, type Page } from "@playwright/test";

/**
 * The guest journey this batch promises (AC1.1–AC1.4): browse, filter, open a product, choose a variant, add
 * it to the cart, and find the cart holding the right total — on a desktop and on a phone.
 */

/**
 * The filter panel, wherever this viewport keeps it: in the sidebar on a desktop, behind the "Filters"
 * button on a phone.
 */
async function openFilters(page: Page) {
  // Wait for the toolbar to be on the page before asking which layout is in use: `isVisible()` does not
  // auto-wait, so checking too early reads "no Filters button" and takes the desktop branch on a phone.
  await expect(page.getByLabel("Sort products")).toBeVisible();

  const filtersButton = page.getByRole("button", { name: "Filters" });
  if (await filtersButton.isVisible()) {
    await filtersButton.click();
    return page.getByRole("dialog").getByTestId("filter-panel");
  }
  return page.getByRole("complementary", { name: "Filters" }).getByTestId("filter-panel");
}

test.describe("home", () => {
  test("shows the hero and the featured products", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "New arrivals" })).toBeVisible();
    await expect(page.getByRole("link", { name: "SHOP NOW" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Featured products" })).toBeVisible();
    await expect(page.getByTestId("product-card").first()).toBeVisible();

    await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("RC 8276954");
  });

  test("the page never scrolls sideways", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("shop filters", () => {
  test("filtering by brand puts the brand in the URL and narrows the results", async ({ page }) => {
    await page.goto("/shop");

    const before = await page.getByTestId("product-card").count();
    expect(before).toBeGreaterThan(0);

    const filters = await openFilters(page);
    // A click, not `check()`: ticking a filter navigates, and the re-rendered page replaces the element
    // before Playwright can read its new state back.
    await filters.getByRole("checkbox", { name: /^Apple/ }).click();

    await expect(page).toHaveURL(/brand=apple/);
    await expect(page.getByRole("button", { name: /Apple/ }).first()).toBeVisible();

    const cards = page.getByTestId("product-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeLessThanOrEqual(before);
  });

  test("a price filter is restorable from the URL", async ({ page }) => {
    await page.goto("/shop?brand=apple&minPrice=1000000&sort=price-asc");

    await expect(page.getByRole("button", { name: /From ₦1,000,000/ })).toBeVisible();

    const prices = await page.getByTestId("product-card").locator(".numeric").first().allInnerTexts();
    expect(prices.join()).toContain("₦");

    // Clearing a chip takes the filter back out of the URL.
    await page.getByRole("button", { name: /From ₦1,000,000/ }).click();
    await expect(page).not.toHaveURL(/minPrice/);
  });

  test("an impossible filter shows the empty state, not an error", async ({ page }) => {
    await page.goto("/shop?minPrice=99999999");
    await expect(page.getByText("Nothing matches those filters")).toBeVisible();
  });
});

test.describe("product and cart", () => {
  test("choosing a variant updates the price and adding it fills the cart", async ({ page }) => {
    await page.goto("/product/apple-iphone-15");

    await expect(page.getByRole("heading", { level: 1, name: "Apple iPhone 15" })).toBeVisible();

    const price = page.getByTestId("product-price");
    const firstPrice = (await price.innerText()).trim();

    // The 256GB option costs more than the 128GB one, so the panel has to change.
    await page.getByTestId("variant-option").filter({ hasText: "256GB" }).first().click();
    await expect(price).not.toHaveText(firstPrice);

    await page.getByTestId("add-to-cart").click();

    await expect(page.getByTestId("cart-count")).toHaveText("1");

    await page.goto("/cart");
    await expect(page.getByTestId("cart-line")).toHaveCount(1);
    await expect(page.getByTestId("cart-subtotal")).toContainText("₦");
  });

  test("the cart survives a reload", async ({ page }) => {
    await page.goto("/product/oraimo-freepods-4");
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("cart-count")).toHaveText("1");

    await page.reload();
    await expect(page.getByTestId("cart-count")).toHaveText("1");
  });

  test("an out-of-stock product cannot be added", async ({ page }) => {
    await page.goto("/product/nokia-g21");
    await expect(page.getByText("Out of stock").first()).toBeVisible();
    await expect(page.getByTestId("add-to-cart")).toBeDisabled();
  });
});

test.describe("search", () => {
  test("suggestions appear and lead to the product", async ({ page }) => {
    await page.goto("/");

    const search = page.getByRole("combobox", { name: "Search products" }).first();
    await search.fill("iph");

    const option = page.getByRole("option").first();
    await expect(option).toBeVisible();
    await option.click();

    await expect(page).toHaveURL(/\/product\//);
  });

  test("the results page is reachable from the URL", async ({ page }) => {
    await page.goto("/search?q=oraimo");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("oraimo");
    await expect(page.getByTestId("product-card").first()).toBeVisible();
  });
});
