/**
 * `pnpm seed` — fills an empty database with the shop (overview §13). It refuses to run against production,
 * and it replaces the catalogue wholesale rather than merging, so running it twice gives the same result.
 *
 * Batch 1 seeds the catalogue half: settings, categories, brands and products. Admins, customers and order
 * history arrive in the later batches and slot in beside `seedCatalogue` without changing it.
 */

import path from "node:path";
import type mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDatabase, disconnectDatabase } from "../db.js";
import { parseNairaToKobo } from "@aib/shared";
import { buildSku, suggestModelCode } from "../lib/sku.js";
import { slugify } from "../lib/slug.js";
import { Brand, Category, Counter, Product, Setting } from "../models/index.js";
import { SEED_PRODUCTS } from "./data/products.js";
import { SEED_BRANDS, SEED_CATEGORIES } from "./data/taxonomy.js";
import { STORE_SETTINGS } from "./data/store-settings.js";
import { writePlaceholderImage } from "./placeholder-image.js";
import {
  DEMO_ADMIN_PASSWORD,
  DEMO_ADMINS,
  DEMO_CUSTOMER_PASSWORD,
  seedAdmins,
  seedCustomers,
  seedOrderHistory,
} from "./demo.js";
import { writeDemoAccounts } from "./demo-accounts.js";

export async function seedCatalogue(): Promise<{ categories: number; brands: number; products: number }> {
  const imageDir = path.resolve(process.cwd(), env.UPLOAD_DIR, "seed");

  await Promise.all([
    Setting.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
    Product.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  await Setting.create(STORE_SETTINGS);

  const categoryIds = new Map<string, mongoose.Types.ObjectId>();
  let categoryCount = 0;
  for (const [index, category] of SEED_CATEGORIES.entries()) {
    const parent = await Category.create({
      name: category.name,
      slug: category.slug,
      image: category.image,
      parent: null,
      sortOrder: index,
      isActive: true,
    });
    categoryIds.set(category.slug, parent._id);
    categoryCount += 1;

    for (const [childIndex, child] of (category.children ?? []).entries()) {
      const created = await Category.create({
        name: child.name,
        slug: child.slug,
        image: null,
        parent: parent._id,
        sortOrder: childIndex,
        isActive: true,
      });
      categoryIds.set(child.slug, created._id);
      categoryCount += 1;
    }
  }

  const brands = new Map<string, { id: mongoose.Types.ObjectId; name: string; code: string }>();
  for (const brand of SEED_BRANDS) {
    const created = await Brand.create({
      name: brand.name,
      slug: brand.slug,
      code: brand.code,
      logo: null,
      isActive: true,
    });
    brands.set(brand.slug, { id: created._id, name: created.name, code: created.code });
  }

  let skuSequence = 0;
  let productCount = 0;

  for (const seed of SEED_PRODUCTS) {
    const brand = brands.get(seed.brand);
    const categoryId = categoryIds.get(seed.category);
    if (!brand || !categoryId) {
      throw new Error(`"${seed.name}" refers to an unknown brand or category.`);
    }

    const slug = slugify(seed.name);
    const modelCode = suggestModelCode(seed.name, brand.name);
    const imageUrl = await writePlaceholderImage({
      directory: imageDir,
      slug,
      brand: brand.name,
      name: seed.name.replace(new RegExp(`^${brand.name}\\s+`, "i"), ""),
      silhouette: seed.silhouette,
    });

    await Product.create({
      name: seed.name,
      slug,
      brand: brand.id,
      brandName: brand.name,
      category: categoryId,
      shortDescription: seed.shortDescription,
      description: seed.description,
      highlights: seed.highlights,
      specs: seed.specs.map(([label, value]) => ({ label, value })),
      images: [{ url: imageUrl, alt: `${seed.name} — placeholder image`, sortOrder: 0 }],
      condition: seed.condition ?? "NEW",
      warrantyMonths: seed.warrantyMonths,
      tags: seed.tags,
      isFeatured: seed.featured ?? false,
      isNewArrival: seed.newArrival ?? false,
      status: "ACTIVE",
      variants: seed.variants.map((variant) => {
        skuSequence += 1;
        return {
          sku: buildSku({
            brandCode: brand.code,
            modelCode,
            attributes: {
              storage: variant.storage ?? null,
              colour: variant.colour ?? null,
              ram: variant.ram ?? null,
            },
            sequence: skuSequence,
          }),
          label: variant.label,
          attributes: {
            storage: variant.storage ?? null,
            colour: variant.colour ?? null,
            ram: variant.ram ?? null,
          },
          priceKobo: parseNairaToKobo(variant.priceNaira),
          compareAtPriceKobo:
            variant.compareAtNaira === undefined ? null : parseNairaToKobo(variant.compareAtNaira),
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold ?? STORE_SETTINGS.lowStockDefault,
          isActive: true,
        };
      }),
    });
    productCount += 1;
  }

  return { categories: categoryCount, brands: brands.size, products: productCount };
}

async function main(): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error("The seed refuses to run with NODE_ENV=production.");
  }

  await connectDatabase();
  const counts = await seedCatalogue();

  const admins = await seedAdmins();
  const customers = await seedCustomers();
  const history = await seedOrderHistory({ admins, customers });
  await writeDemoAccounts();

  const variants = SEED_PRODUCTS.reduce((sum, product) => sum + product.variants.length, 0);
  const outOfStock = SEED_PRODUCTS.filter((product) =>
    product.variants.every((variant) => variant.stock === 0),
  ).length;

  console.log("");
  console.log("  Seeded ALI_IWANBUY Gadgets");
  console.log(`    settings    1 (${STORE_SETTINGS.bank.bankName} · ${STORE_SETTINGS.bank.accountNumber})`);
  console.log(`    categories  ${counts.categories}`);
  console.log(`    brands      ${counts.brands}`);
  console.log(`    products    ${counts.products} (${variants} variants, ${outOfStock} out of stock)`);
  console.log(`    images      server/${env.UPLOAD_DIR}/seed`);
  console.log(`    admins      ${admins.length}`);
  console.log(`    customers   ${customers.length}`);
  console.log(`    orders      ${history.orders} (${history.payments} payments, ${history.invoices} invoices)`);
  console.log("");
  console.log("  Demo sign-ins — also written to docs/DEMO-ACCOUNTS.md:");
  for (const admin of DEMO_ADMINS) {
    console.log(`    ${admin.role.padEnd(8)} ${admin.email.padEnd(28)} ${DEMO_ADMIN_PASSWORD}${admin.pin ? `  PIN ${admin.pin}` : ""}`);
  }
  console.log(`    CUSTOMER amina@example.com           ${DEMO_CUSTOMER_PASSWORD}`);
  console.log("");

  await disconnectDatabase();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
