/**
 * A small, explicit catalogue for the query tests — fifteen lines of data whose every price, stock level and
 * status is visible in one place, so a failing filter test points straight at the filter.
 */

import type { ProductCondition, ProductStatus } from "@aib/shared";
import type { Types } from "mongoose";
import {
  AuditLog,
  Brand,
  Cart,
  Category,
  Counter,
  Customer,
  Order,
  Product,
  Setting,
} from "../src/models/index.js";

export type Fixture = {
  categories: Record<string, Types.ObjectId>;
  brands: Record<string, Types.ObjectId>;
};

type ProductSpec = {
  name: string;
  slug: string;
  brand: string;
  category: string;
  status?: ProductStatus;
  condition?: ProductCondition;
  tags?: string[];
  featured?: boolean;
  newArrival?: boolean;
  variants: { label: string; sku: string; priceKobo: number; stock: number; compareAtPriceKobo?: number }[];
};

const PRODUCTS: ProductSpec[] = [
  {
    name: "Apple iPhone 15",
    slug: "apple-iphone-15",
    brand: "apple",
    category: "iphone",
    tags: ["flagship"],
    featured: true,
    newArrival: true,
    variants: [
      { label: "128GB", sku: "APL-I15-128-0001", priceKobo: 125_000_000, stock: 5 },
      { label: "256GB", sku: "APL-I15-256-0002", priceKobo: 142_000_000, stock: 2 },
    ],
  },
  {
    name: "Apple iPhone 12",
    slug: "apple-iphone-12",
    brand: "apple",
    category: "iphone",
    condition: "UK_USED",
    variants: [{ label: "64GB", sku: "APL-I12-64-0003", priceKobo: 62_000_000, stock: 3 }],
  },
  {
    name: "Samsung Galaxy A15",
    slug: "samsung-galaxy-a15",
    brand: "samsung",
    category: "android",
    tags: ["budget"],
    featured: true,
    variants: [
      {
        label: "128GB",
        sku: "SAM-A15-128-0004",
        priceKobo: 28_500_000,
        stock: 12,
        compareAtPriceKobo: 32_000_000,
      },
    ],
  },
  {
    name: "Samsung Galaxy S23 Ultra",
    slug: "samsung-galaxy-s23-ultra",
    brand: "samsung",
    category: "android",
    variants: [{ label: "256GB", sku: "SAM-S23U-256-0005", priceKobo: 135_000_000, stock: 0 }],
  },
  {
    name: "Oraimo FreePods 4",
    slug: "oraimo-freepods-4",
    brand: "oraimo",
    category: "earbuds",
    newArrival: true,
    variants: [{ label: "Black", sku: "ORM-FP4-BLA-0006", priceKobo: 3_250_000, stock: 20 }],
  },
  {
    name: "Oraimo Draft Earbuds",
    slug: "oraimo-draft-earbuds",
    brand: "oraimo",
    category: "earbuds",
    status: "DRAFT",
    variants: [{ label: "Black", sku: "ORM-DFT-BLA-0007", priceKobo: 1_000_000, stock: 4 }],
  },
  {
    name: "Oraimo Archived Speaker",
    slug: "oraimo-archived-speaker",
    brand: "oraimo",
    category: "earbuds",
    status: "ARCHIVED",
    variants: [{ label: "Black", sku: "ORM-ARC-BLA-0008", priceKobo: 2_000_000, stock: 4 }],
  },
];

export async function clearDatabase(): Promise<void> {
  await Promise.all([
    Category.deleteMany({}),
    Brand.deleteMany({}),
    Product.deleteMany({}),
    Setting.deleteMany({}),
    Counter.deleteMany({}),
    Customer.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({}),
    // The audit model refuses deletes by design, so the test reset goes around it at the driver level.
    AuditLog.collection.deleteMany({}),
  ]);
}

export async function seedFixture(): Promise<Fixture> {
  await clearDatabase();

  const phones = await Category.create({ name: "Phones", slug: "phones", sortOrder: 0 });
  const iphone = await Category.create({ name: "iPhone", slug: "iphone", parent: phones._id, sortOrder: 0 });
  const android = await Category.create({
    name: "Android",
    slug: "android",
    parent: phones._id,
    sortOrder: 1,
  });
  const audio = await Category.create({ name: "Audio", slug: "audio", sortOrder: 1 });
  const earbuds = await Category.create({
    name: "Earbuds",
    slug: "earbuds",
    parent: audio._id,
    sortOrder: 0,
  });
  const hidden = await Category.create({ name: "Hidden", slug: "hidden", sortOrder: 2, isActive: false });

  const apple = await Brand.create({ name: "Apple", slug: "apple", code: "APL" });
  const samsung = await Brand.create({ name: "Samsung", slug: "samsung", code: "SAM" });
  const oraimo = await Brand.create({ name: "Oraimo", slug: "oraimo", code: "ORM" });

  const categories: Record<string, Types.ObjectId> = {
    phones: phones._id,
    iphone: iphone._id,
    android: android._id,
    audio: audio._id,
    earbuds: earbuds._id,
    hidden: hidden._id,
  };
  const brands: Record<string, Types.ObjectId> = {
    apple: apple._id,
    samsung: samsung._id,
    oraimo: oraimo._id,
  };
  const brandNames: Record<string, string> = { apple: "Apple", samsung: "Samsung", oraimo: "Oraimo" };

  // Created in order with a distinct timestamp each, so "newest" is deterministic.
  let createdAt = new Date("2026-01-01T09:00:00.000Z").getTime();
  for (const spec of PRODUCTS) {
    createdAt += 60_000;
    await Product.create({
      name: spec.name,
      slug: spec.slug,
      brand: brands[spec.brand],
      brandName: brandNames[spec.brand],
      category: categories[spec.category],
      shortDescription: `${spec.name} short description`,
      description: `${spec.name} description`,
      highlights: ["Tested in store"],
      specs: [{ label: "Warranty", value: "12 months" }],
      images: [{ url: `/uploads/seed/${spec.slug}.webp`, alt: spec.name, sortOrder: 0 }],
      condition: spec.condition ?? "NEW",
      warrantyMonths: 12,
      tags: spec.tags ?? [],
      isFeatured: spec.featured ?? false,
      isNewArrival: spec.newArrival ?? false,
      status: spec.status ?? "ACTIVE",
      createdAt: new Date(createdAt),
      variants: spec.variants.map((variant) => ({
        sku: variant.sku,
        label: variant.label,
        attributes: { storage: null, colour: null, ram: null },
        priceKobo: variant.priceKobo,
        compareAtPriceKobo: variant.compareAtPriceKobo ?? null,
        stock: variant.stock,
        lowStockThreshold: 3,
        isActive: true,
      })),
    });
  }

  return { categories, brands };
}

export async function seedSettings(): Promise<void> {
  await Setting.create({
    storeName: "ALI_IWANBUY Gadgets",
    legalName: "ALI_IWANBUY INTEGRATED SERVICE LTD",
    rcNumber: "8276954",
    tin: "32843883-0001",
    registeredAddress: "No. 26, Olumbo Plaza, Ahmadu Bello Way, Birnin Kebbi",
    shopAddress: "Shop 7 & 8, Olumbu Plaza, Birnin Kebbi",
    phone: "+234 703 925 4143",
    whatsapp: "+234 703 925 4143",
    email: "sales@aliiwanbuy.com",
    deliveryFees: { localKobo: 150_000, nationwideKobo: 500_000 },
    freeDeliveryThresholdKobo: 50_000_000,
  });
}

/** The id of a product and one of its variants, for the cart tests. */
export async function variantRef(
  slug: string,
): Promise<{ productId: string; variantId: string; priceKobo: number }> {
  const product = await Product.findOne({ slug }).lean().exec();
  if (!product || !product.variants[0]) {
    throw new Error(`Fixture product "${slug}" is missing.`);
  }
  return {
    productId: product._id.toString(),
    variantId: product.variants[0]._id.toString(),
    priceKobo: product.variants[0].priceKobo,
  };
}
