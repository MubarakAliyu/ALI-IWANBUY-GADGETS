/**
 * The cart of a signed-in customer (S-6, overview §7).
 *
 * The stored cart holds only product, variant and quantity. Everything a customer sees — the name, the price,
 * what is left in stock — is read from the catalogue each time the cart is shown, so a cart left open for a
 * week cannot quietly hold yesterday's price.
 *
 * Merging is what happens at sign-in: the quantities a guest built up in their browser are added to whatever
 * is already on the account, then capped at what is actually in stock (AC2.2).
 */

import { multiplyKobo, type SaveCartInput, type ServerCart } from "@aib/shared";
import type { ClientSession } from "mongoose";
import { Types } from "mongoose";
import { Cart, Product, type ProductDoc } from "../models/index.js";

const MAX_QTY_PER_LINE = 99;

type StoredLine = { product: Types.ObjectId; variantId: Types.ObjectId; qty: number };

/** Read the stored lines and price them from the catalogue, dropping anything no longer for sale. */
export async function getCart(customerId: string): Promise<ServerCart> {
  const cart = await Cart.findOne({ customer: customerId }).lean().exec();
  if (!cart || cart.items.length === 0) {
    return { items: [], subtotalKobo: 0 };
  }

  const products = await Product.find({
    _id: { $in: cart.items.map((item) => item.product) },
    status: "ACTIVE",
  })
    .select("name slug images variants")
    .lean()
    .exec();

  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  const items: ServerCart["items"] = [];
  const surviving: StoredLine[] = [];

  for (const line of cart.items) {
    const product = byId.get(line.product.toString());
    const variant = product?.variants.find(
      (candidate) => candidate._id.toString() === line.variantId.toString() && candidate.isActive,
    );
    if (!product || !variant || variant.stock <= 0) {
      continue;
    }

    const qty = Math.min(line.qty, variant.stock, MAX_QTY_PER_LINE);
    const image = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];

    items.push({
      productId: product._id.toString(),
      variantId: variant._id.toString(),
      name: product.name,
      slug: product.slug,
      variantLabel: variant.label,
      sku: variant.sku,
      image: image?.url ?? null,
      unitPriceKobo: variant.priceKobo,
      qty,
      stock: variant.stock,
      lineTotalKobo: multiplyKobo(variant.priceKobo, qty),
    });
    surviving.push({ product: product._id, variantId: variant._id, qty });
  }

  // A line that has gone out of stock or off sale is dropped from storage too, so it stops reappearing.
  if (surviving.length !== cart.items.length) {
    await Cart.updateOne({ customer: customerId }, { $set: { items: surviving } }).exec();
  }

  return { items, subtotalKobo: items.reduce((sum, item) => sum + item.lineTotalKobo, 0) };
}

/** Replace the stored cart with exactly these lines, after checking each one is real and in stock. */
export async function saveCart(customerId: string, input: SaveCartInput): Promise<ServerCart> {
  await Cart.updateOne(
    { customer: customerId },
    { $set: { items: await validLines(input.items) } },
    { upsert: true },
  ).exec();
  return getCart(customerId);
}

/**
 * Fold a guest's browser cart into the account's cart: quantities for the same variant are added together,
 * then the whole thing is capped at stock. Called once, right after sign-in or registration.
 */
export async function mergeCart(customerId: string, input: SaveCartInput): Promise<ServerCart> {
  const existing = await Cart.findOne({ customer: customerId }).lean().exec();
  const totals = new Map<string, { product: Types.ObjectId; variantId: Types.ObjectId; qty: number }>();

  for (const line of existing?.items ?? []) {
    totals.set(`${line.product.toString()}:${line.variantId.toString()}`, { ...line });
  }

  for (const line of input.items) {
    const key = `${line.productId}:${line.variantId}`;
    const current = totals.get(key);
    if (current) {
      current.qty += line.qty;
    } else {
      totals.set(key, {
        product: new Types.ObjectId(line.productId),
        variantId: new Types.ObjectId(line.variantId),
        qty: line.qty,
      });
    }
  }

  const merged = await capToStock([...totals.values()]);
  await Cart.updateOne({ customer: customerId }, { $set: { items: merged } }, { upsert: true }).exec();
  return getCart(customerId);
}

export async function clearCart(customerId: string, session?: ClientSession): Promise<void> {
  const query = Cart.updateOne({ customer: customerId }, { $set: { items: [] } }, { upsert: true });
  if (session) {
    query.session(session);
  }
  await query.exec();
}

async function validLines(lines: { productId: string; variantId: string; qty: number }[]) {
  return capToStock(
    lines.map((line) => ({
      product: new Types.ObjectId(line.productId),
      variantId: new Types.ObjectId(line.variantId),
      qty: line.qty,
    })),
  );
}

/** Drop lines whose product or variant is no longer on sale, and cap the rest at what is in stock. */
async function capToStock(lines: StoredLine[]): Promise<StoredLine[]> {
  if (lines.length === 0) {
    return [];
  }

  const products = await Product.find({
    _id: { $in: lines.map((line) => line.product) },
    status: "ACTIVE",
  })
    .select("variants")
    .lean<Pick<ProductDoc, "_id" | "variants">[]>()
    .exec();

  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  return lines.flatMap((line) => {
    const variant = byId
      .get(line.product.toString())
      ?.variants.find(
        (candidate) => candidate._id.toString() === line.variantId.toString() && candidate.isActive,
      );
    if (!variant || variant.stock <= 0) {
      return [];
    }
    return [{ ...line, qty: Math.min(line.qty, variant.stock, MAX_QTY_PER_LINE) }];
  });
}
