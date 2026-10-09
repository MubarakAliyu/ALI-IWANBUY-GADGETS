import { beforeEach, describe, expect, it } from "vitest";
import { CART_STORAGE_KEY, cartCount, cartSubtotalKobo, useCartStore } from "@/stores/cart";

const iphone = {
  productId: "6ac8002f62475df7c0762800",
  variantId: "6ac8002f62475df7c0762801",
  slug: "apple-iphone-15",
  name: "Apple iPhone 15",
  variantLabel: "128GB · Black",
  sku: "APL-I15-128BLA-0001",
  image: "/uploads/seed/apple-iphone-15.webp",
  unitPriceKobo: 125_000_000,
  stock: 3,
};

const earbuds = {
  productId: "6ac8002f62475df7c0762900",
  variantId: "6ac8002f62475df7c0762901",
  slug: "oraimo-freepods-4",
  name: "Oraimo FreePods 4",
  variantLabel: "Black",
  sku: "ORM-FP4-BLA-0006",
  image: null,
  unitPriceKobo: 3_250_000,
  stock: 20,
};

function lines() {
  return useCartStore.getState().lines;
}

describe("the cart store", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [] });
    window.localStorage.clear();
  });

  it("adds a line", () => {
    useCartStore.getState().add(iphone);
    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toMatchObject({ slug: "apple-iphone-15", qty: 1 });
  });

  it("tops up the same product and variant instead of adding a second row", () => {
    useCartStore.getState().add(iphone);
    useCartStore.getState().add(iphone, 2);
    expect(lines()).toHaveLength(1);
    expect(lines()[0]?.qty).toBe(3);
  });

  it("keeps different variants of one product apart", () => {
    useCartStore.getState().add(iphone);
    useCartStore.getState().add({ ...iphone, variantId: "6ac8002f62475df7c0762802", variantLabel: "256GB" });
    expect(lines()).toHaveLength(2);
  });

  it("never lets a quantity exceed the stock it knows about", () => {
    useCartStore.getState().add(iphone, 10);
    expect(lines()[0]?.qty).toBe(3);

    useCartStore.getState().setQty(iphone.productId, iphone.variantId, 99);
    expect(lines()[0]?.qty).toBe(3);
  });

  it("refuses to add something with no stock", () => {
    useCartStore.getState().add({ ...iphone, stock: 0 });
    expect(lines()).toHaveLength(0);
  });

  it("removes a line when its quantity reaches zero", () => {
    useCartStore.getState().add(iphone);
    useCartStore.getState().setQty(iphone.productId, iphone.variantId, 0);
    expect(lines()).toHaveLength(0);
  });

  it("removes and clears", () => {
    useCartStore.getState().add(iphone);
    useCartStore.getState().add(earbuds);
    useCartStore.getState().remove(iphone.productId, iphone.variantId);
    expect(lines()).toHaveLength(1);

    useCartStore.getState().clear();
    expect(lines()).toHaveLength(0);
  });

  it("counts items and totals them in kobo", () => {
    useCartStore.getState().add(iphone, 2);
    useCartStore.getState().add(earbuds, 3);
    expect(cartCount(lines())).toBe(5);
    expect(cartSubtotalKobo(lines())).toBe(125_000_000 * 2 + 3_250_000 * 3);
  });

  it("persists to localStorage so the cart survives a reload", () => {
    useCartStore.getState().add(iphone, 2);
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored as string).state.lines[0]).toMatchObject({ slug: "apple-iphone-15", qty: 2 });
  });

  it("takes the server's answer as the truth when the cart is validated", () => {
    useCartStore.getState().add(iphone, 3);
    useCartStore.getState().applyValidation({
      items: [
        {
          productId: iphone.productId,
          variantId: iphone.variantId,
          name: iphone.name,
          slug: iphone.slug,
          variantLabel: iphone.variantLabel,
          sku: iphone.sku,
          image: iphone.image,
          unitPriceKobo: 131_000_000,
          qty: 1,
          stock: 1,
          lineTotalKobo: 131_000_000,
        },
      ],
      issues: [],
      subtotalKobo: 131_000_000,
    });

    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toMatchObject({ qty: 1, unitPriceKobo: 131_000_000, stock: 1 });
  });

  it("drops lines the server returned with nothing left", () => {
    useCartStore.getState().add(iphone);
    useCartStore.getState().applyValidation({
      items: [
        {
          productId: iphone.productId,
          variantId: iphone.variantId,
          name: iphone.name,
          slug: iphone.slug,
          variantLabel: iphone.variantLabel,
          sku: iphone.sku,
          image: iphone.image,
          unitPriceKobo: iphone.unitPriceKobo,
          qty: 0,
          stock: 0,
          lineTotalKobo: 0,
        },
      ],
      issues: [
        {
          productId: iphone.productId,
          variantId: iphone.variantId,
          name: iphone.name,
          issue: "OUT_OF_STOCK",
        },
      ],
      subtotalKobo: 0,
    });

    expect(lines()).toHaveLength(0);
  });
});
