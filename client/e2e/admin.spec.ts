import { expect, test, type Page } from "@playwright/test";

/**
 * The dashboard journey this batch promises (AC3.1, AC3.2, AC3.4, AC3.5, AC3.7).
 *
 * It runs against the seeded demo data — the three admins `pnpm seed` creates — and the money path is driven
 * end to end: a customer places an order and says they have paid, then the owner refuses a wrong PIN, accepts
 * the right one, and the invoice appears and can be sent. The audit trail then has to show both.
 *
 * Every run creates its own customer and its own order, so the suite can be run repeatedly.
 */

const ADMIN_PASSWORD = "Owner12345";
const OWNER = { email: "owner@aliiwanbuy.com", pin: "8426" };
const MANAGER = { email: "manager@aliiwanbuy.com" };
const STAFF = { email: "staff@aliiwanbuy.com" };
const CUSTOMER_PASSWORD = "Password123";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

async function signInAsAdmin(page: Page, email: string) {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Dashboard sign-in" })).toBeVisible();

  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 30_000 });
}

/**
 * A customer, an order and "I've paid" — the state the dashboard needs before the owner can confirm
 * anything. Returns the order number.
 */
async function placeAwaitingOrder(page: Page): Promise<string> {
  const email = uniqueEmail("e2e-admin");

  await page.goto("/register");
  const terms = page.getByRole("checkbox", { name: /I accept/ });
  await expect(async () => {
    if ((await terms.getAttribute("aria-checked")) !== "true") {
      await terms.click();
    }
    await expect(terms).toHaveAttribute("aria-checked", "true", { timeout: 500 });
  }).toPass({ timeout: 20_000 });

  await page.getByRole("textbox", { name: "First name" }).fill("Esther");
  await page.getByRole("textbox", { name: "Last name" }).fill("Dashboard");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(CUSTOMER_PASSWORD);
  await page.getByLabel("Confirm password").fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).not.toHaveURL(/\/register/, { timeout: 20_000 });
  await expect(page.getByTestId("account-menu")).toHaveAccessibleName(/Account menu for/, {
    timeout: 20_000,
  });

  await page.goto("/product/oraimo-freepods-4");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toBeVisible();

  await page.goto("/checkout");
  await page.getByTestId("delivery-LOCAL_DELIVERY").click();
  await page.getByRole("textbox", { name: "Full name" }).fill("Esther Dashboard");
  await page.getByRole("textbox", { name: "Phone" }).fill("08039254143");
  await page.getByRole("textbox", { name: "Address", exact: true }).fill("12 Ahmadu Bello Way");
  await page.getByRole("textbox", { name: "City or town" }).fill("Birnin Kebbi");
  await page.getByRole("button", { name: "Use this address" }).click();

  await page.getByTestId("payment-BANK_TRANSFER").click();

  await page
    .getByTestId(/place-order/)
    .filter({ visible: true })
    .first()
    .click();

  await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 30_000 });
  const orderNumber = (await page.getByTestId("order-number").innerText()).trim();

  // "I've paid" moves it into the queue the owner confirms against. Retried as a whole: a click that lands
  // before React has taken over the server-rendered button does nothing at all, and the page looks the same.
  await page.goto(`/account/orders/${orderNumber}`);
  await expect(async () => {
    await page.getByTestId("declare-transfer").click({ timeout: 2_000 });
    await expect(page.getByTestId("confirm-transfer")).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  await page.getByTestId("confirm-transfer").click();
  await expect(page.getByText(/Awaiting confirmation/i).first()).toBeVisible({ timeout: 20_000 });

  return orderNumber;
}

test.describe("the dashboard", () => {
  test("owner: confirm a payment with the PIN, then send the invoice", async ({ page }) => {
    // The longest journey in the suite — register, checkout, declare, sign in as the owner, confirm, send
    // and check the trail. In development each of those routes is compiled the first time it is opened.
    test.setTimeout(240_000);

    const orderNumber = await placeAwaitingOrder(page);

    // Signing in as the owner replaces the customer's session in this browser, which is what a shared
    // computer at the counter would do anyway.
    await signInAsAdmin(page, OWNER.email);

    // AC3.3 — the overview renders its figures, not eight skeletons.
    const tiles = page.getByRole("region", { name: "Key figures" });
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(tiles.getByText("Revenue", { exact: true })).toBeVisible();
    await expect(tiles.getByText("Awaiting confirmation")).toBeVisible();
    // A figure, not a placeholder: the tile holds a naira amount.
    await expect(tiles.getByText(/^₦[\d,]+$/).first()).toBeVisible();

    await page.goto(`/admin/orders/${orderNumber}`);
    await expect(page.getByRole("heading", { name: orderNumber })).toBeVisible();

    await page.getByRole("button", { name: "Confirm payment" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // A wrong PIN is refused and the dialog stays open with what was typed into the other fields.
    await dialog.getByLabel("Payment reference").fill("E2E-REF-001");
    await dialog.getByLabel("Your payment PIN").fill("1357");
    await dialog.getByRole("button", { name: /Confirm ₦/ }).click();
    await expect(dialog.getByRole("alert")).toContainText(/not correct/i, { timeout: 20_000 });
    await expect(dialog.getByLabel("Payment reference")).toHaveValue("E2E-REF-001");

    // The right one confirms it.
    await dialog.getByLabel("Your payment PIN").fill(OWNER.pin);
    await dialog.getByRole("button", { name: /Confirm ₦/ }).click();

    await expect(page.getByText("Paid").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Payment confirmed/).first()).toBeVisible();

    // AC3.4 — an invoice exists and is reachable.
    await page.goto("/admin/invoices");
    const row = page.getByRole("row").filter({ hasText: orderNumber });
    await expect(row).toBeVisible({ timeout: 20_000 });

    await row.getByRole("button", { name: /Actions for/ }).click();
    await page.getByRole("menuitem", { name: /Send to the customer/i }).click();
    await expect(page.getByText(/Sent to/i).first()).toBeVisible({ timeout: 30_000 });

    // AC3.7 — both actions are in the trail.
    await page.goto("/admin/audit");
    await expect(page.getByText(new RegExp(`Confirmed .*${orderNumber}`))).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/emailed to/i).first()).toBeVisible();
  });

  test("manager: no admin users, no settings", async ({ page }) => {
    await signInAsAdmin(page, MANAGER.email);

    // The nav does not offer them…
    await expect(page.getByRole("link", { name: "Admin users" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Store settings" })).toHaveCount(0);

    // …and typing the address does not get past the server either. UI hiding is not security.
    for (const path of ["/admin/admins", "/admin/settings"]) {
      const response = await page.request.get(`/api/v1${path.replace("/admin/", "/admin/")}`);
      expect(response.status(), path).toBe(403);
    }
  });

  test("staff: fulfils orders and sees no money", async ({ page }) => {
    await signInAsAdmin(page, STAFF.email);

    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    // No revenue figures anywhere on the overview.
    await expect(page.getByText("Revenue", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Average order")).toHaveCount(0);

    // The operational half is there.
    await expect(page.getByText("To fulfil")).toBeVisible();

    // The money sections are not in the navigation. On a phone that navigation lives in a drawer, so it has
    // to be opened before it can be looked at — the count is zero either way, which is the point.
    const drawer = page.getByRole("button", { name: "Open the menu" });
    if (await drawer.isVisible().catch(() => false)) {
      await drawer.click();
    }
    await expect(page.getByRole("link", { name: "Payments" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Invoices" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Orders", exact: true }).first()).toBeVisible();

    // And the server refuses the money endpoints outright.
    expect((await page.request.get("/api/v1/admin/payments")).status()).toBe(403);
    expect((await page.request.get("/api/v1/admin/invoices")).status()).toBe(403);
  });

  test("owner: create a product with a variant and see it in the shop", async ({ page }) => {
    await signInAsAdmin(page, OWNER.email);

    const suffix = Date.now().toString(36).slice(-5).toUpperCase();
    const name = `E2E Test Gadget ${suffix}`;

    await page.goto("/admin/products/new");
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("One-line summary").fill("Created by the end-to-end suite.");

    await page.getByLabel("Label", { exact: true }).fill("Standard");
    await page.getByRole("textbox", { name: "SKU" }).fill(`E2E-TEST-${suffix}`);
    await page.getByLabel("Price (₦)").fill("25000");
    await page.getByLabel("In stock").fill("3");

    // It has to be in the shop to be visible from the storefront.
    await page.getByLabel("Status").selectOption("ACTIVE");

    await page.getByRole("button", { name: "Add the product" }).click();
    await expect(page.getByText(/added to the catalogue/i)).toBeVisible({ timeout: 30_000 });

    // AC3.5 — it reaches the storefront.
    //
    // Its own page, not the search listing: the catalogue listings are statically rendered and revalidate
    // every 60 seconds (ADR-011), so a product created a second ago is legitimately not in them yet. A new
    // product's own page has no cached copy, so it is rendered on demand and is there immediately — which is
    // the thing being claimed.
    const slug = `e2e-test-gadget-${suffix.toLowerCase()}`;
    await page.goto(`/product/${slug}`);
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("add-to-cart")).toBeVisible();

    // Put it back: this suite runs against a database someone will demo from.
    await page.goto("/admin/products");
    await page.getByPlaceholder("Name, brand or SKU…").fill(name);
    await page.getByPlaceholder("Name, brand or SKU…").press("Enter");
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText(/hidden/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
