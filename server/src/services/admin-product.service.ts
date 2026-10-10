/**
 * Managing the catalogue (overview §10 A-5).
 *
 * The rule that shapes this file: **a variant is never replaced, only edited.** Order line items snapshot a
 * variant's id, and stock is decremented against it, so an edit that dropped the variants and re-created them
 * would quietly orphan every order that referenced one. A variant arriving without an id is new; one with an
 * id is the existing document, updated in place; one that is missing from the payload is removed only if
 * nothing has ever been ordered from it.
 */

import type {
  AdminProductQuery,
  AdminProductRow,
  ProductInput,
  StockAdjustInput,
  VariantInput,
} from "@aib/shared";
import type { Request } from "express";
import mongoose, { Types, type FilterQuery } from "mongoose";
import { AppError } from "../lib/app-error.js";
import { keysForUrl } from "../lib/images.js";
import { paginate, skipFor, type Paginated } from "../lib/pagination.js";
import { attributeCode, buildSku, normaliseSku } from "../lib/sku.js";
import { uniqueSlug } from "../lib/slug.js";
import { storage } from "../lib/storage.js";
import { Brand, Category, Order, Product, type ProductDoc } from "../models/index.js";
import type { SignedInAdmin } from "../middleware/require-admin.js";
import { recordAudit } from "./audit.service.js";

const DEFAULT_LIMIT = 25;

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listProducts(query: AdminProductQuery): Promise<Paginated<AdminProductRow>> {
  const filter: FilterQuery<ProductDoc> = {};

  if (query.status) {
    filter.status = query.status;
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.brand) {
    filter.brand = query.brand;
  }
  if (query.stock === "out") {
    filter.totalStock = 0;
  } else if (query.stock === "low") {
    filter.totalStock = { $gt: 0, $lte: 3 };
  } else if (query.stock === "in") {
    filter.totalStock = { $gt: 0 };
  }

  const term = query.q?.trim();
  if (term) {
    const pattern = new RegExp(escapeRegex(term), "i");
    filter.$or = [{ name: pattern }, { brandName: pattern }, { "variants.sku": pattern }];
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = query.limit ?? DEFAULT_LIMIT;
  const sort = { [query.sort ?? "updatedAt"]: query.dir === "asc" ? 1 : -1 } as Record<string, 1 | -1>;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skipFor(page, limit))
      .limit(limit)
      .populate("category", "name")
      .lean()
      .exec(),
    Product.countDocuments(filter).exec(),
  ]);

  const rows = products.map((product): AdminProductRow => {
    const category = product.category as unknown as { name?: string } | null;
    return {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      image: product.images[0]?.url ?? null,
      brandName: product.brandName,
      categoryName: category?.name ?? "—",
      status: product.status,
      condition: product.condition,
      variantCount: product.variants.length,
      totalStock: product.totalStock,
      priceFromKobo: product.priceFromKobo,
      updatedAt: product.updatedAt.toISOString(),
    };
  });

  return paginate(rows, total, page, limit);
}

/** One product, with everything the editor needs to render its form. */
export async function getProduct(id: string): Promise<ProductDoc> {
  if (!Types.ObjectId.isValid(id)) {
    throw AppError.notFound("We cannot find that product.");
  }
  const product = await Product.findById(id).lean<ProductDoc>().exec();
  if (!product) {
    throw AppError.notFound("We cannot find that product.");
  }
  return product;
}

/** A slug nothing else is using, derived from the name unless one was typed. */
async function productSlug(name: string, wanted: string | undefined, exceptId?: string): Promise<string> {
  return uniqueSlug(wanted || name, async (candidate) => {
    const clash = await Product.findOne({ slug: candidate }).select("_id").lean().exec();
    return clash !== null && clash._id.toString() !== exceptId;
  });
}

/** A SKU for a variant that arrived without one, built from the brand, the model and the attributes. */
function suggestedSku(
  brandCode: string,
  productName: string,
  variant: VariantInput,
  sequence: number,
): string {
  return buildSku({
    brandCode,
    modelCode: productName
      .replace(/[^a-z0-9 ]/gi, "")
      .split(/\s+/)
      .map((word) => (/^\d/.test(word) ? word : word.slice(0, 1)))
      .join("")
      .toUpperCase()
      .slice(0, 6),
    attributes: variant.attributes ?? {},
    sequence,
  });
}

/** Every SKU in the catalogue has to be unique, including against the product being edited. */
async function assertSkusFree(skus: string[], exceptProductId?: string): Promise<void> {
  const duplicatesInPayload = skus.filter((sku, index) => skus.indexOf(sku) !== index);
  if (duplicatesInPayload.length > 0) {
    throw AppError.badRequest(`Two variants share the SKU ${duplicatesInPayload[0]}.`, [
      { path: "variants", message: "SKUs must be unique" },
    ]);
  }

  const filter: FilterQuery<ProductDoc> = { "variants.sku": { $in: skus } };
  if (exceptProductId) {
    filter._id = { $ne: exceptProductId };
  }
  const clash = await Product.findOne(filter).select("name variants.sku").lean().exec();
  if (clash) {
    const taken = clash.variants.find((variant) => skus.includes(variant.sku));
    throw AppError.badRequest(`${taken?.sku} is already used by ${clash.name}.`, [
      { path: "variants", message: "That SKU is already in use" },
    ]);
  }
}

/** The variant subdocuments to save, keeping the ids of the ones that already existed. */
function mergeVariants(
  existing: ProductDoc["variants"],
  incoming: VariantInput[],
  brandCode: string,
  productName: string,
): ProductDoc["variants"] {
  return incoming.map((variant, index) => {
    const previous = variant.id ? existing.find((row) => row._id.toString() === variant.id) : undefined;
    const attributes = {
      storage: variant.attributes?.storage ?? null,
      colour: variant.attributes?.colour ?? null,
      ram: variant.attributes?.ram ?? null,
    };

    return {
      _id: previous?._id ?? new Types.ObjectId(),
      sku: variant.sku.trim()
        ? normaliseSku(variant.sku)
        : suggestedSku(brandCode, productName, variant, index + 1),
      label: variant.label || attributeCode(attributes) || `Option ${index + 1}`,
      attributes,
      priceKobo: variant.priceKobo,
      compareAtPriceKobo: variant.compareAtPriceKobo ?? null,
      stock: variant.stock,
      lowStockThreshold: variant.lowStockThreshold,
      isActive: variant.isActive,
    };
  });
}

/** A variant can only disappear if nothing was ever ordered from it. */
async function assertRemovableVariants(
  productId: Types.ObjectId,
  removed: ProductDoc["variants"],
): Promise<void> {
  if (removed.length === 0) {
    return;
  }
  const ordered = await Order.findOne({
    "items.product": productId,
    "items.variantId": { $in: removed.map((variant) => variant._id) },
  })
    .select("orderNumber")
    .lean()
    .exec();

  if (ordered) {
    throw new AppError(
      409,
      "VARIANT_IN_USE",
      `That variant appears on ${ordered.orderNumber}, so it cannot be deleted. Make it unavailable instead.`,
    );
  }
}

async function brandAndCategory(input: ProductInput): Promise<{ brandName: string; brandCode: string }> {
  const [brand, category] = await Promise.all([
    Brand.findById(input.brand).select("name code").lean().exec(),
    Category.findById(input.category).select("_id").lean().exec(),
  ]);

  if (!brand) {
    throw AppError.badRequest("Choose a brand that exists.", [{ path: "brand", message: "Unknown brand" }]);
  }
  if (!category) {
    throw AppError.badRequest("Choose a category that exists.", [
      { path: "category", message: "Unknown category" },
    ]);
  }
  return { brandName: brand.name, brandCode: brand.code };
}

export async function createProduct(
  input: ProductInput,
  admin: SignedInAdmin,
  req?: Request,
): Promise<ProductDoc> {
  const { brandName, brandCode } = await brandAndCategory(input);
  const slug = await productSlug(input.name, input.slug);
  const variants = mergeVariants([], input.variants, brandCode, input.name);
  await assertSkusFree(variants.map((variant) => variant.sku));

  const product = await Product.create({
    ...input,
    slug,
    brandName,
    images: input.images.map((image, index) => ({ ...image, sortOrder: index })),
    variants,
  });

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "PRODUCT_CREATED",
    entityType: "Product",
    entityId: product._id,
    summary: `Created ${product.name} with ${variants.length} variant${variants.length === 1 ? "" : "s"}`,
    after: { name: product.name, slug: product.slug, status: product.status },
    ...(req ? { req } : {}),
  });

  return product.toObject() as ProductDoc;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  admin: SignedInAdmin,
  req?: Request,
): Promise<ProductDoc> {
  const product = await Product.findById(id).exec();
  if (!product) {
    throw AppError.notFound("We cannot find that product.");
  }

  const { brandName, brandCode } = await brandAndCategory(input);
  const before = {
    name: product.name,
    status: product.status,
    variants: product.variants.length,
    totalStock: product.totalStock,
  };

  const variants = mergeVariants(product.variants, input.variants, brandCode, input.name);
  await assertSkusFree(
    variants.map((variant) => variant.sku),
    id,
  );

  const keptIds = new Set(variants.map((variant) => variant._id.toString()));
  await assertRemovableVariants(
    product._id,
    product.variants.filter((variant) => !keptIds.has(variant._id.toString())),
  );

  // Images the editor dropped are removed from storage too, so deleting one does not leak three files.
  const keptUrls = new Set(input.images.map((image) => image.url));
  const droppedUrls = product.images.map((image) => image.url).filter((url) => !keptUrls.has(url));

  product.set({
    name: input.name,
    slug: await productSlug(input.name, input.slug, id),
    brand: new Types.ObjectId(input.brand),
    brandName,
    category: new Types.ObjectId(input.category),
    shortDescription: input.shortDescription,
    description: input.description,
    highlights: input.highlights,
    specs: input.specs,
    images: input.images.map((image, index) => ({ ...image, sortOrder: index })),
    condition: input.condition,
    warrantyMonths: input.warrantyMonths,
    tags: input.tags,
    isFeatured: input.isFeatured,
    isNewArrival: input.isNewArrival,
    status: input.status,
    variants,
  });
  await product.save();

  for (const url of droppedUrls) {
    for (const key of keysForUrl(url)) {
      await storage.remove(key);
    }
  }

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "PRODUCT_UPDATED",
    entityType: "Product",
    entityId: product._id,
    summary: `Updated ${product.name}`,
    before,
    after: {
      name: product.name,
      status: product.status,
      variants: product.variants.length,
      totalStock: product.totalStock,
    },
    ...(req ? { req } : {}),
  });

  return product.toObject() as ProductDoc;
}

/** Bulk visibility: the one bulk action worth having (A-5). */
export async function setProductStatus(
  ids: string[],
  status: ProductInput["status"],
  admin: SignedInAdmin,
  req?: Request,
): Promise<{ changed: number }> {
  const result = await Product.updateMany({ _id: { $in: ids } }, { $set: { status } }).exec();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "PRODUCT_STATUS_CHANGED",
    entityType: "Product",
    summary: `${result.modifiedCount} product${result.modifiedCount === 1 ? "" : "s"} set to ${status.toLowerCase()}`,
    after: { status, ids },
    ...(req ? { req } : {}),
  });

  return { changed: result.modifiedCount };
}

/**
 * Adjusting stock (A-5). A delta, applied atomically, so two people counting the same shelf at the same time
 * both land — and so a sale that happens mid-count is not overwritten. Stock can never go below zero.
 */
export async function adjustStock(
  productId: string,
  input: StockAdjustInput,
  admin: SignedInAdmin,
  req?: Request,
): Promise<ProductDoc> {
  const session = await mongoose.startSession();
  let updated: ProductDoc | undefined;

  try {
    await session.withTransaction(async () => {
      const product = await Product.findById(productId).session(session).exec();
      if (!product) {
        throw AppError.notFound("We cannot find that product.");
      }

      const variant = product.variants.find((row) => row._id.toString() === input.variantId);
      if (!variant) {
        throw AppError.notFound("We cannot find that variant.");
      }

      const before = variant.stock;
      const after = before + input.delta;
      if (after < 0) {
        throw AppError.badRequest(
          `There are only ${before} of that variant, so ${input.delta} would take it below zero.`,
          [{ path: "delta", message: "Not enough stock" }],
        );
      }

      variant.stock = after;
      await product.save({ session });
      updated = product.toObject() as ProductDoc;

      await recordAudit({
        actorType: "ADMIN",
        actor: admin._id,
        actorName: `${admin.firstName} ${admin.lastName}`,
        action: "STOCK_ADJUSTED",
        entityType: "Product",
        entityId: product._id,
        summary: `${variant.sku}: ${before} → ${after} (${input.delta > 0 ? "+" : ""}${input.delta}) — ${input.reason}`,
        before: { sku: variant.sku, stock: before },
        after: { sku: variant.sku, stock: after, reason: input.reason },
        session,
        ...(req ? { req } : {}),
      });
    });
  } finally {
    await session.endSession();
  }

  if (!updated) {
    throw new AppError(500, "ADJUST_FAILED", "The stock could not be adjusted. Please try again.");
  }
  return updated;
}
