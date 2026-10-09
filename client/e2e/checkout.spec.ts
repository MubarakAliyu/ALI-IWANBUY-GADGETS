import { expect, test, type Page } from "@playwright/test";

/**
 * The journey this batch promises (AC2.1–AC2.5): a guest fills a cart, creates an account, finds the cart
 * still there, checks out, and watches the order move.
 *
 * Every run registers a new customer, so the suite can be run repeatedly against the same database.
 */

const PASSWORD = "Password123";

/** The "Place order" button, wherever this viewport keeps it: the sticky bar on a phone, the summary card
 * on a desktop. Only one of the two is ever visible. */
function placeOrderButton(page: Page) {
  return page
    .getByTestId(/place-order/)
    .filter({ visible: true })
    .first();
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

async function addToCart(page: Page, slug: string) {
  await page.goto(`/product/${slug}`);
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toBeVisible();
}

async function register(page: Page, email: string) {
  // React has to take over before anything is typed: a value entered into the server-rendered HTML is
  // discarded when the form mounts, and a click on a Radix control does nothing at all. Ticking the terms
  // box is both the first thing the form needs and proof that it is listening.
  const terms = page.getByRole("checkbox", { name: /I accept/ });
  await expect(async () => {
    if ((await terms.getAttribute("aria-checked")) !== "true") {
      await terms.click();
    }
    await expect(terms).toHaveAttribute("aria-checked", "true", { timeout: 500 });
  }).toPass({ timeout: 15_000 });

  await page.getByRole("textbox", { name: "First name" }).fill("Amina");
  await page.getByRole("textbox", { name: "Last name" }).fill("Bello");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  // Signing in is a full page load, so waiting for the URL to change is not enough — the next document is
  // still arriving. The signed-in account menu is the first thing that proves both are done.
  await expect(page).not.toHaveURL(/\/register/, { timeout: 15_000 });
  await expect(page.getByTestId("account-menu")).toHaveAccessibleName(/Account menu for/, {
    timeout: 15_000,
  });
}

/** Signing in, retried as a whole: a submit that lands before hydration is simply lost. */
async function signIn(page: Page, email: string, password: string) {
  await expect(async () => {
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 3_000 });
  }).toPass({ timeout: 20_000 });

  await expect(page.getByTestId("account-menu")).toHaveAccessibleName(/Account menu for/, {
    timeout: 15_000,
  });
}

test.describe("from guest cart to a tracked order", () => {
  test("registers, keeps the cart, checks out and declares the transfer", async ({ page }) => {
    const email = uniqueEmail("journey");

    // Two different products, as a guest.
    await addToCart(page, "oraimo-freepods-4");
    await addToCart(page, "anker-20w-usb-c-charger");
    await expect(page.getByTestId("cart-count")).toHaveText("2");

    // Checkout sends a signed-out visitor to sign in, and remembers where they were going.
    await page.goto("/cart");
    // Wait for the cart to finish checking prices before clicking anything in it.
    await expect(page.getByText("Prices and stock are confirmed with the shop.")).toBeVisible();
    await page.getByRole("link", { name: "Proceed to checkout" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);

    await page.getByRole("link", { name: "Create an account" }).click();
    await register(page, email);

    // Straight to checkout, with the guest cart merged into the new account (AC2.2).
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByTestId("cart-count")).toHaveText("2");

    // Delivery: a new address, typed at checkout.
    await page.getByTestId("delivery-LOCAL_DELIVERY").click();
    await page.getByRole("textbox", { name: "Full name" }).fill("Amina Bello");
    await page.getByRole("textbox", { name: "Phone" }).fill("08039254143");
    await page.getByRole("textbox", { name: "Address", exact: true }).fill("12 Ahmadu Bello Way");
    await page.getByRole("textbox", { name: "City or town" }).fill("Birnin Kebbi");
    await page.getByRole("button", { name: "Use this address" }).click();
    await expect(page.getByText(/Delivering to 12 Ahmadu Bello Way/)).toBeVisible();

    // Payment: bank transfer.
    await page.getByTestId("payment-BANK_TRANSFER").click();

    const total = await page.getByTestId("checkout-total").innerText();

    await placeOrderButton(page).click();

    // The success page carries the order number and how to pay (S-10).
    await expect(page).toHaveURL(/\/checkout\/success\/AIB-ORD-/);
    const orderNumber = (await page.getByTestId("order-number").innerText()).trim();
    expect(orderNumber).toMatch(/^AIB-ORD-\d{6}-\d{4}$/);
    await expect(page.getByRole("heading", { name: "How to pay" })).toBeVisible();
    await expect(page.getByText(total, { exact: false }).first()).toBeVisible();

    // "I've made the transfer" moves it into the confirmation queue (AC2.4).
    await page.getByTestId("declare-transfer").click();
    await page.getByTestId("confirm-transfer").click();
    await expect(page.getByText(/we are checking for your payment/i)).toBeVisible();

    // And My orders shows it with a timeline (AC2.5).
    await page.goto("/account/orders");
    await expect(page.getByTestId("order-row").first()).toContainText(orderNumber);
    await expect(page.getByText("Awaiting confirmation").first()).toBeVisible();

    await page.goto(`/account/orders/${orderNumber}`);
    await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
    await expect(page.getByText("Pending payment")).toBeVisible();
    await expect(page.getByTestId("order-total")).toHaveText(total);
  });

  test("pay on delivery goes straight into preparation", async ({ page }) => {
    const email = uniqueEmail("cash");

    await addToCart(page, "oraimo-freepods-4");
    await page.goto("/register");
    await register(page, email);

    await page.goto("/checkout");
    await page.getByTestId("payment-PAY_ON_DELIVERY").click();
    await placeOrderButton(page).click();

    await expect(page).toHaveURL(/\/checkout\/success\//);
    await expect(page.getByRole("heading", { name: "What happens next" })).toBeVisible();

    await page.goto("/account/orders");
    await expect(page.getByText("Processing").first()).toBeVisible();
  });

  test("an order can be cancelled before it is paid for", async ({ page }) => {
    const email = uniqueEmail("cancel");

    await addToCart(page, "anker-20w-usb-c-charger");
    await page.goto("/register");
    await register(page, email);

    await page.goto("/checkout");
    await placeOrderButton(page).click();
    await expect(page).toHaveURL(/\/checkout\/success\//);

    const orderNumber = (await page.getByTestId("order-number").innerText()).trim();
    await page.goto(`/account/orders/${orderNumber}`);

    await page.getByTestId("cancel-order").click();
    await page.getByTestId("confirm-cancel").click();

    await expect(page.getByText("Cancelled").first()).toBeVisible();
    await expect(page.getByTestId("cancel-order")).toHaveCount(0);
  });
});

test.describe("the account area", () => {
  test("shows the email as read-only, saves a change and keeps an address", async ({ page }) => {
    const email = uniqueEmail("settings");
    await page.goto("/register");
    await register(page, email);

    await page.goto("/account/settings");

    // The email is shown, and cannot be edited (AC2.1).
    const emailField = page.getByTestId("email-readonly");
    await expect(emailField).toHaveValue(email);
    await expect(emailField).toBeDisabled();
    await expect(page.getByText("Your email can't be changed")).toBeVisible();

    await page.getByRole("textbox", { name: "First name" }).fill("Aminat");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Your details are saved")).toBeVisible();

    // Addresses.
    await page.getByRole("tab", { name: "Addresses" }).click();
    await page.getByRole("button", { name: "Add an address" }).click();
    await page.getByRole("textbox", { name: "Full name" }).fill("Amina Bello");
    await page.getByRole("textbox", { name: "Phone" }).fill("08039254143");
    await page.getByRole("textbox", { name: "Address", exact: true }).fill("7 Olumbu Plaza");
    await page.getByRole("textbox", { name: "City or town" }).fill("Birnin Kebbi");
    await page.getByRole("button", { name: "Save address" }).click();

    await expect(page.getByTestId("address-card")).toHaveCount(1);
    await expect(page.getByTestId("address-card")).toContainText("7 Olumbu Plaza");
  });

  test("changes the password and signs in with the new one", async ({ page }) => {
    const email = uniqueEmail("password");
    await page.goto("/register");
    await register(page, email);

    await page.goto("/account/settings");
    await page.getByRole("tab", { name: "Password" }).click();

    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill("BrandNew123");
    await page.getByLabel("Confirm new password").fill("BrandNew123");
    await page.getByRole("button", { name: "Change password" }).click();

    await expect(page.getByText("Your password is changed").first()).toBeVisible();

    // Sign out, then back in with the new password.
    await page.getByTestId("account-menu").click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();

    await page.goto("/login");
    await signIn(page, email, "BrandNew123");
    await expect(page).toHaveURL(/\/account\/orders/);
  });

  test("saves a product to the wishlist", async ({ page }) => {
    const email = uniqueEmail("wishlist");
    await page.goto("/register");
    await register(page, email);

    await page.goto("/product/jbl-flip-6");
    await page.getByTestId("wishlist-toggle").click();
    await expect(page.getByTestId("wishlist-toggle")).toHaveAttribute("aria-pressed", "true");

    await page.goto("/account/wishlist");
    await expect(page.getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByTestId("product-card")).toContainText("JBL Flip 6");
  });

  test("sends a signed-out visitor to sign in", async ({ page }) => {
    await page.goto("/account/settings");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fsettings/);
  });
});
