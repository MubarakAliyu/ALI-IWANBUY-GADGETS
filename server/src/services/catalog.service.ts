/**
 * The public catalogue (overview §11). Every rule about what a guest may see lives here: only `ACTIVE`
 * products are ever returned, a category filter includes that category's children, and prices leave in the
 * integer kobo they were stored in.
 *
 * Controllers call these functions and do nothing else.
 */

import {
  PRODUCT_PAGE_SIZE,
  type Brand as BrandDto,
  type Category as CategoryDto,
  type CategoryNode,
  type HomePayload,
  type ProductCard,
  type ProductDetail,
  type ProductListQuery,
  type PublicSettings,
  type SearchSuggestion,
  type Variant as VariantDto,
} from "@aib/shared";
import type { FilterQuery, Types } from "mongoose";
import { AppError } from "../lib/app-error.js";
import { paginate, skipFor, type Paginated } from "../lib/pagination.js";
import { Brand, Category, Product, Setting } from "../models/index.js";
import type { ProductDoc, VariantDoc } from "../models/product.model.js";

const FEATURED_LIMIT = 8;
const NEW_ARRIVALS_LIMIT = 8;
const RELATED_LIMIT = 8;
const SUGGEST_LIMIT = 6;
const SUGGEST_MIN_LENGTH = 2;

type Ref = { _id: Types.ObjectId; name: string; slug: string };
type LeanProduct = Omit<ProductDoc, "brand" | "category"> & { brand: Ref; category: Ref };

const CARD_FIELDS =
  "name slug brand brandName category images condition priceFromKobo compareAtPriceKobo totalStock isFeatured isNewArrival variants createdAt";

/** A user-typed string used inside a regular expression must not be able to act as one. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toCard(product: LeanProduct): ProductCard {
  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  const considered = activeVariants.length > 0 ? activeVariants : product.variants;
  const cheapest = considered.reduce(
    (lowest, variant) => (lowest && lowest.priceKobo <= variant.priceKobo ? lowest : variant),
    considered[0],
  );
  return {
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    brand: { id: product.brand._id.toString(), name: product.brand.name, slug: product.brand.slug },
    category: {
      id: product.category._id.toString(),
      name: product.category.name,
      slug: product.category.slug,
    },
    image: images[0] ? { url: images[0].url, alt: images[0].alt, sortOrder: images[0].sortOrder } : null,
    condition: product.condition,
    priceFromKobo: product.priceFromKobo,
    compareAtPriceKobo: product.compareAtPriceKobo,
    totalStock: product.totalStock,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    variantCount: Math.max(1, activeVariants.length),
    defaultVariant: {
      id: cheapest?._id.toString() ?? "",
      sku: cheapest?.sku ?? "",
      label: cheapest?.label ?? "",
      priceKobo: cheapest?.priceKobo ?? product.priceFromKobo,
      stock: cheapest?.stock ?? 0,
    },
  };
}

function toVariant(variant: VariantDoc): VariantDto {
  return {
    id: variant._id.toString(),
    sku: variant.sku,
    label: variant.label,
    attributes: {
      storage: variant.attributes?.storage ?? null,
      colour: variant.attributes?.colour ?? null,
      ram: variant.attributes?.ram ?? null,
    },
    priceKobo: variant.priceKobo,
    compareAtPriceKobo: variant.compareAtPriceKobo ?? null,
    stock: variant.stock,
    lowStockThreshold: variant.lowStockThreshold,
  };
}

function toDetail(product: LeanProduct): ProductDetail {
  return {
    ...toCard(product),
    shortDescription: product.shortDescription,
    description: product.description,
    highlights: product.highlights,
    specs: product.specs.map((spec) => ({ label: spec.label, value: spec.value })),
    images: [...product.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({ url: image.url, alt: image.alt, sortOrder: image.sortOrder })),
    warrantyMonths: product.warrantyMonths,
    tags: product.tags,
    variants: product.variants.filter((variant) => variant.isActive).map(toVariant),
  };
}

function toCategoryDto(
  category: {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    image: string | null;
    parent: Types.ObjectId | null;
    sortOrder: number;
  },
  productCount?: number,
): CategoryDto {
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    image: category.image,
    parent: category.parent ? category.parent.toString() : null,
    sortOrder: category.sortOrder,
    ...(productCount === undefined ? {} : { productCount }),
  };
}

async function findProducts(filter: FilterQuery<ProductDoc>, sort: Record<string, 1 | -1>, limit: number) {
  const docs = await Product.find(filter)
    .select(CARD_FIELDS)
    .populate("brand", "name slug")
    .populate("category", "name slug")
    .sort(sort)
    .limit(limit)
    .lean()
    .exec();
  return (docs as unknown as LeanProduct[]).map(toCard);
}

/** Active product counts per category id, including the children rolled up into their parent. */
async function productCountsByCategory(): Promise<Map<string, number>> {
  const [rows, categories] = await Promise.all([
    Product.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { status: "ACTIVE" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]).exec(),
    Category.find({ isActive: true }).select("parent").lean().exec(),
  ]);

  const own = new Map<string, number>();
  for (const row of rows) {
    own.set(row._id.toString(), row.count);
  }

  const totals = new Map(own);
  for (const category of categories) {
    if (!category.parent) {
      continue;
    }
    const childCount = own.get(category._id.toString()) ?? 0;
    const parentId = category.parent.toString();
    totals.set(parentId, (totals.get(parentId) ?? 0) + childCount);
  }
  return totals;
}

/** The category and its children — a filter on "Phones" must also return the iPhones beneath it. */
async function categoryBranchIds(slug: string): Promise<Types.ObjectId[] | null> {
  const category = await Category.findOne({ slug, isActive: true }).select("_id").lean().exec();
  if (!category) {
    return null;
  }
  const children = await Category.find({ parent: category._id, isActive: true }).select("_id").lean().exec();
  return [category._id, ...children.map((child) => child._id)];
}

/**
 * Product cards for a known set of ids, in the order the ids were given — what the wishlist shows. Ids that
 * no longer point at an active product are simply absent, so a withdrawn product disappears from a wishlist
 * rather than breaking it.
 */
export async function productCardsByIds(ids: readonly string[]): Promise<ProductCard[]> {
  if (ids.length === 0) {
    return [];
  }
  const docs = await Product.find({ _id: { $in: ids }, status: "ACTIVE" })
    .select(CARD_FIELDS)
    .populate("brand", "name slug")
    .populate("category", "name slug")
    .lean()
    .exec();

  const cards = new Map((docs as unknown as LeanProduct[]).map((doc) => [doc._id.toString(), toCard(doc)]));
  return ids.map((id) => cards.get(id)).filter((card): card is ProductCard => card !== undefined);
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean().exec(),
    productCountsByCategory(),
  ]);

  const roots = categories.filter((category) => !category.parent);
  return roots.map((root) => ({
    ...toCategoryDto(root, counts.get(root._id.toString()) ?? 0),
    children: categories
      .filter((category) => category.parent?.toString() === root._id.toString())
      .map((child) => toCategoryDto(child, counts.get(child._id.toString()) ?? 0)),
  }));
}

export async function listBrands(): Promise<BrandDto[]> {
  const [brands, rows] = await Promise.all([
    Brand.find({ isActive: true }).sort({ name: 1 }).lean().exec(),
    Product.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { status: "ACTIVE" } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
    ]).exec(),
  ]);
  const counts = new Map(rows.map((row) => [row._id.toString(), row.count]));
  return brands.map((brand) => ({
    id: brand._id.toString(),
    name: brand.name,
    slug: brand.slug,
    logo: brand.logo,
    productCount: counts.get(brand._id.toString()) ?? 0,
  }));
}

export async function getHome(): Promise<HomePayload> {
  const [featured, newArrivals, categories, brands] = await Promise.all([
    findProducts({ status: "ACTIVE", isFeatured: true }, { createdAt: -1 }, FEATURED_LIMIT),
    findProducts({ status: "ACTIVE", isNewArrival: true }, { createdAt: -1 }, NEW_ARRIVALS_LIMIT),
    getCategoryTree(),
    listBrands(),
  ]);
  return { featured, newArrivals, categories, brands };
}

const SORTS: Record<ProductListQuery["sort"], Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { priceFromKobo: 1, _id: 1 },
  "price-desc": { priceFromKobo: -1, _id: -1 },
  name: { name: 1, _id: 1 },
};

export async function listProducts(query: ProductListQuery): Promise<Paginated<ProductCard>> {
  const filter: FilterQuery<ProductDoc> = { status: "ACTIVE" };

  if (query.category) {
    const branch = await categoryBranchIds(query.category);
    if (!branch) {
      return paginate<ProductCard>([], 0, query.page, query.limit);
    }
    filter.category = { $in: branch };
  }

  if (query.brand && query.brand.length > 0) {
    const brands = await Brand.find({ slug: { $in: query.brand }, isActive: true })
      .select("_id")
      .lean()
      .exec();
    if (brands.length === 0) {
      return paginate<ProductCard>([], 0, query.page, query.limit);
    }
    filter.brand = { $in: brands.map((brand) => brand._id) };
  }

  if (query.condition) {
    filter.condition = query.condition;
  }

  if (query.minPriceKobo !== undefined || query.maxPriceKobo !== undefined) {
    const price: Record<string, number> = {};
    if (query.minPriceKobo !== undefined) {
      price.$gte = query.minPriceKobo;
    }
    if (query.maxPriceKobo !== undefined) {
      price.$lte = query.maxPriceKobo;
    }
    filter.priceFromKobo = price;
  }

  if (query.inStock) {
    filter.totalStock = { $gt: 0 };
  }

  if (query.featured) {
    filter.isFeatured = true;
  }

  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: pattern }, { brandName: pattern }, { tags: pattern }];
  }

  const limit = query.limit || PRODUCT_PAGE_SIZE;
  const [docs, total] = await Promise.all([
    Product.find(filter)
      .select(CARD_FIELDS)
      .populate("brand", "name slug")
      .populate("category", "name slug")
      .sort(SORTS[query.sort])
      .skip(skipFor(query.page, limit))
      .limit(limit)
      .lean()
      .exec(),
    Product.countDocuments(filter).exec(),
  ]);

  return paginate((docs as unknown as LeanProduct[]).map(toCard), total, query.page, limit);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const product = await Product.findOne({ slug, status: "ACTIVE" })
    .populate("brand", "name slug")
    .populate("category", "name slug")
    .lean()
    .exec();
  if (!product) {
    throw AppError.notFound("That product is not available.");
  }
  return toDetail(product as unknown as LeanProduct);
}

export async function getRelatedProducts(slug: string): Promise<ProductCard[]> {
  const product = await Product.findOne({ slug, status: "ACTIVE" }).select("category").lean().exec();
  if (!product) {
    throw AppError.notFound("That product is not available.");
  }
  return findProducts(
    { status: "ACTIVE", category: product.category, _id: { $ne: product._id } },
    { createdAt: -1 },
    RELATED_LIMIT,
  );
}

/**
 * Search suggestions for the header (S-1). They appear from the second character typed, so this matches on a
 * substring rather than whole words, and puts the products whose name starts with the query first.
 */
export async function suggestProducts(rawQuery: string): Promise<SearchSuggestion[]> {
  const q = rawQuery.trim();
  if (q.length < SUGGEST_MIN_LENGTH) {
    return [];
  }
  const pattern = new RegExp(escapeRegex(q), "i");
  const docs = await Product.find({
    status: "ACTIVE",
    $or: [{ name: pattern }, { brandName: pattern }, { tags: pattern }],
  })
    .select("name slug brandName images priceFromKobo")
    .limit(SUGGEST_LIMIT * 3)
    .lean()
    .exec();

  const starts = new RegExp(`^${escapeRegex(q)}`, "i");
  return docs
    .sort((a, b) => Number(starts.test(b.name)) - Number(starts.test(a.name)) || a.name.localeCompare(b.name))
    .slice(0, SUGGEST_LIMIT)
    .map((doc) => {
      const image = [...doc.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
      return {
        name: doc.name,
        slug: doc.slug,
        brand: doc.brandName,
        image: image?.url ?? null,
        priceFromKobo: doc.priceFromKobo,
      };
    });
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const setting = await Setting.findOne().lean().exec();
  if (!setting) {
    throw AppError.notFound("The store has not been set up yet. Run `pnpm seed`.");
  }
  return {
    storeName: setting.storeName,
    legalName: setting.legalName,
    rcNumber: setting.rcNumber,
    tin: setting.tin,
    registeredAddress: setting.registeredAddress,
    shopAddress: setting.shopAddress,
    phone: setting.phone,
    whatsapp: setting.whatsapp,
    email: setting.email,
    deliveryFees: {
      localKobo: setting.deliveryFees.localKobo,
      nationwideKobo: setting.deliveryFees.nationwideKobo,
    },
    freeDeliveryThresholdKobo: setting.freeDeliveryThresholdKobo,
  };
}
