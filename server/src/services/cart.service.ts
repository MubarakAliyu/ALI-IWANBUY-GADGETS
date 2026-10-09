/**
 * Cart validation (S-6). A guest cart lives in the browser, so nothing in it can be trusted: before the cart
 * page shows a total, the server re-reads every line from the database and reports what changed — a product
 * withdrawn, a variant out of stock, a quantity above what is left, or a price that moved.
 *
 * The client never sends a price. Prices only ever come back from here.
 */

import {
  multiplyKobo,
  type CartReportedIssue,
  type CartValidateRequest,
  type CartValidateResponse,
  type CartValidatedItem,
} from "@aib/shared";
import { Product } from "../models/index.js";

export async function validateCart(request: CartValidateRequest): Promise<CartValidateResponse> {
  const items: CartValidatedItem[] = [];
  const issues: CartReportedIssue[] = [];

  if (request.items.length === 0) {
    return { items, issues, subtotalKobo: 0 };
  }

  const products = await Product.find({
    _id: { $in: request.items.map((item) => item.productId) },
    status: "ACTIVE",
  })
    .select("name slug images variants")
    .lean()
    .exec();

  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  for (const line of request.items) {
    const product = byId.get(line.productId);
    const variant = product?.variants.find(
      (candidate) => candidate._id.toString() === line.variantId && candidate.isActive,
    );

    if (!product || !variant) {
      issues.push({
        productId: line.productId,
        variantId: line.variantId,
        name: product?.name ?? "This item",
        issue: "REMOVED",
        previousQty: line.qty,
      });
      continue;
    }

    const image = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    const base = {
      productId: line.productId,
      variantId: line.variantId,
      name: product.name,
      slug: product.slug,
      variantLabel: variant.label,
      sku: variant.sku,
      image: image?.url ?? null,
      unitPriceKobo: variant.priceKobo,
      stock: variant.stock,
    };

    if (variant.stock === 0) {
      issues.push({
        productId: line.productId,
        variantId: line.variantId,
        name: product.name,
        issue: "OUT_OF_STOCK",
        previousQty: line.qty,
      });
      items.push({ ...base, qty: 0, lineTotalKobo: 0 });
      continue;
    }

    if (line.unitPriceKobo !== undefined && line.unitPriceKobo !== variant.priceKobo) {
      issues.push({
        productId: line.productId,
        variantId: line.variantId,
        name: product.name,
        issue: "PRICE_CHANGED",
        previousUnitPriceKobo: line.unitPriceKobo,
      });
    }

    const qty = Math.min(line.qty, variant.stock);
    if (qty < line.qty) {
      issues.push({
        productId: line.productId,
        variantId: line.variantId,
        name: product.name,
        issue: "QTY_REDUCED",
        previousQty: line.qty,
      });
    }

    items.push({ ...base, qty, lineTotalKobo: multiplyKobo(variant.priceKobo, qty) });
  }

  const subtotalKobo = items.reduce((sum, item) => sum + item.lineTotalKobo, 0);
  return { items, issues, subtotalKobo };
}
