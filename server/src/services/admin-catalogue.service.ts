/**
 * Categories and brands (overview §10 A-6).
 *
 * Both are small, and both are referenced by every product, so the interesting rules are about what happens
 * when one is removed: nothing is deleted while a product still points at it. Archiving is offered instead,
 * which hides it from the storefront without breaking the products that reference it.
 *
 * A brand rename rewrites `brandName` on its products, because that field is denormalised for search (ADR-009)
 * and a rename that left it behind would make the catalogue disagree with itself.
 */

import type { BrandInput, CategoryInput } from "@aib/shared";
import type { Request } from "express";
import { Types } from "mongoose";
import { AppError } from "../lib/app-error.js";
import { uniqueSlug } from "../lib/slug.js";
import { Brand, Category, Product, type BrandDoc, type CategoryDoc } from "../models/index.js";
import type { SignedInAdmin } from "../middleware/require-admin.js";
import { recordAudit } from "./audit.service.js";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  parentName: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  code: string;
  logo: string | null;
  isActive: boolean;
  productCount: number;
};

/** Every category with how many products are in it, so the owner can see what emptying one would cost. */
export async function listCategories(): Promise<CategoryRow[]> {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean().exec(),
    Product.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]).exec(),
  ]);

  const byId = new Map(counts.map((row) => [row._id.toString(), row.count]));
  const names = new Map(categories.map((category) => [category._id.toString(), category.name]));

  return categories.map((category) => ({
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    parent: category.parent ? category.parent.toString() : null,
    parentName: category.parent ? (names.get(category.parent.toString()) ?? null) : null,
    image: category.image,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount: byId.get(category._id.toString()) ?? 0,
  }));
}

export async function listBrands(): Promise<BrandRow[]> {
  const [brands, counts] = await Promise.all([
    Brand.find().sort({ name: 1 }).lean().exec(),
    Product.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $group: { _id: "$brand", count: { $sum: 1 } } },
    ]).exec(),
  ]);

  const byId = new Map(counts.map((row) => [row._id.toString(), row.count]));

  return brands.map((brand) => ({
    id: brand._id.toString(),
    name: brand.name,
    slug: brand.slug,
    code: brand.code,
    logo: brand.logo,
    isActive: brand.isActive,
    productCount: byId.get(brand._id.toString()) ?? 0,
  }));
}

/** The catalogue is two levels deep (overview §5): a category's parent may not itself have one. */
async function assertParentIsTopLevel(parent: string | null | undefined, selfId?: string): Promise<void> {
  if (!parent) {
    return;
  }
  if (parent === selfId) {
    throw AppError.badRequest("A category cannot be inside itself.", [
      { path: "parent", message: "Choose a different parent" },
    ]);
  }
  const candidate = await Category.findById(parent).select("parent").lean().exec();
  if (!candidate) {
    throw AppError.badRequest("Choose a parent category that exists.", [
      { path: "parent", message: "Unknown category" },
    ]);
  }
  if (candidate.parent) {
    throw AppError.badRequest("Categories only go two levels deep.", [
      { path: "parent", message: "That category is already inside another" },
    ]);
  }
}

export async function createCategory(
  input: CategoryInput,
  admin: SignedInAdmin,
  req?: Request,
): Promise<CategoryDoc> {
  await assertParentIsTopLevel(input.parent);

  const slug = await uniqueSlug(input.slug || input.name, async (candidate) => {
    return (await Category.countDocuments({ slug: candidate }).exec()) > 0;
  });

  const category = await Category.create({
    ...input,
    slug,
    parent: input.parent ? new Types.ObjectId(input.parent) : null,
  });

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "CATEGORY_CREATED",
    entityType: "Category",
    entityId: category._id,
    summary: `Created the category ${category.name}`,
    after: { name: category.name, slug: category.slug },
    ...(req ? { req } : {}),
  });

  return category.toObject() as CategoryDoc;
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
  admin: SignedInAdmin,
  req?: Request,
): Promise<CategoryDoc> {
  const category = await Category.findById(id).exec();
  if (!category) {
    throw AppError.notFound("We cannot find that category.");
  }
  await assertParentIsTopLevel(input.parent, id);

  // A category with children cannot be moved inside another — that would make three levels.
  if (input.parent) {
    const children = await Category.countDocuments({ parent: category._id }).exec();
    if (children > 0) {
      throw AppError.badRequest(
        `${category.name} has ${children} categor${children === 1 ? "y" : "ies"} inside it, so it cannot go inside another.`,
        [{ path: "parent", message: "This category has children" }],
      );
    }
  }

  const before = { name: category.name, isActive: category.isActive, sortOrder: category.sortOrder };

  category.set({
    name: input.name,
    image: input.image ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    parent: input.parent ? new Types.ObjectId(input.parent) : null,
  });
  await category.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "CATEGORY_UPDATED",
    entityType: "Category",
    entityId: category._id,
    summary: `Updated the category ${category.name}`,
    before,
    after: { name: category.name, isActive: category.isActive, sortOrder: category.sortOrder },
    ...(req ? { req } : {}),
  });

  return category.toObject() as CategoryDoc;
}

export async function deleteCategory(id: string, admin: SignedInAdmin, req?: Request): Promise<void> {
  const category = await Category.findById(id).exec();
  if (!category) {
    throw AppError.notFound("We cannot find that category.");
  }

  const [products, children] = await Promise.all([
    Product.countDocuments({ category: category._id }).exec(),
    Category.countDocuments({ parent: category._id }).exec(),
  ]);

  if (products > 0 || children > 0) {
    throw new AppError(
      409,
      "CATEGORY_IN_USE",
      products > 0
        ? `${products} product${products === 1 ? " is" : "s are"} in ${category.name}. Move them first, or hide the category instead.`
        : `${category.name} has categories inside it. Remove those first.`,
    );
  }

  await Category.deleteOne({ _id: category._id }).exec();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "CATEGORY_DELETED",
    entityType: "Category",
    entityId: category._id,
    summary: `Deleted the empty category ${category.name}`,
    before: { name: category.name, slug: category.slug },
    ...(req ? { req } : {}),
  });
}

/** The order the storefront lists them in, set by moving rows rather than typing numbers. */
export async function reorderCategories(
  ids: string[],
  admin: SignedInAdmin,
  req?: Request,
): Promise<CategoryRow[]> {
  await Promise.all(
    ids.map((id, index) => Category.updateOne({ _id: id }, { $set: { sortOrder: index } }).exec()),
  );

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "CATEGORY_REORDERED",
    entityType: "Category",
    summary: `Reordered ${ids.length} categories`,
    after: { order: ids },
    ...(req ? { req } : {}),
  });

  return listCategories();
}

export async function createBrand(
  input: BrandInput,
  admin: SignedInAdmin,
  req?: Request,
): Promise<BrandDoc> {
  const clash = await Brand.findOne({ code: input.code }).select("name").lean().exec();
  if (clash) {
    throw AppError.badRequest(`${input.code} is already used by ${clash.name}.`, [
      { path: "code", message: "That code is taken" },
    ]);
  }

  const slug = await uniqueSlug(input.slug || input.name, async (candidate) => {
    return (await Brand.countDocuments({ slug: candidate }).exec()) > 0;
  });

  const brand = await Brand.create({ ...input, slug });

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "BRAND_CREATED",
    entityType: "Brand",
    entityId: brand._id,
    summary: `Created the brand ${brand.name} (${brand.code})`,
    after: { name: brand.name, code: brand.code },
    ...(req ? { req } : {}),
  });

  return brand.toObject() as BrandDoc;
}

export async function updateBrand(
  id: string,
  input: BrandInput,
  admin: SignedInAdmin,
  req?: Request,
): Promise<BrandDoc> {
  const brand = await Brand.findById(id).exec();
  if (!brand) {
    throw AppError.notFound("We cannot find that brand.");
  }

  const clash = await Brand.findOne({ code: input.code, _id: { $ne: brand._id } })
    .select("name")
    .lean()
    .exec();
  if (clash) {
    throw AppError.badRequest(`${input.code} is already used by ${clash.name}.`, [
      { path: "code", message: "That code is taken" },
    ]);
  }

  const before = { name: brand.name, code: brand.code, isActive: brand.isActive };
  const renamed = brand.name !== input.name;

  brand.set({
    name: input.name,
    code: input.code,
    logo: input.logo ?? null,
    isActive: input.isActive,
  });
  await brand.save();

  // `brandName` is denormalised onto every product for search (ADR-009), so a rename has to reach them.
  let rewritten = 0;
  if (renamed) {
    const result = await Product.updateMany(
      { brand: brand._id },
      { $set: { brandName: brand.name } },
    ).exec();
    rewritten = result.modifiedCount;
  }

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "BRAND_UPDATED",
    entityType: "Brand",
    entityId: brand._id,
    summary: renamed
      ? `Renamed the brand to ${brand.name} and rewrote it on ${rewritten} product${rewritten === 1 ? "" : "s"}`
      : `Updated the brand ${brand.name}`,
    before,
    after: { name: brand.name, code: brand.code, isActive: brand.isActive },
    ...(req ? { req } : {}),
  });

  return brand.toObject() as BrandDoc;
}

export async function deleteBrand(id: string, admin: SignedInAdmin, req?: Request): Promise<void> {
  const brand = await Brand.findById(id).exec();
  if (!brand) {
    throw AppError.notFound("We cannot find that brand.");
  }

  const products = await Product.countDocuments({ brand: brand._id }).exec();
  if (products > 0) {
    throw new AppError(
      409,
      "BRAND_IN_USE",
      `${products} product${products === 1 ? " is" : "s are"} from ${brand.name}. Move them first, or hide the brand instead.`,
    );
  }

  await Brand.deleteOne({ _id: brand._id }).exec();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "BRAND_DELETED",
    entityType: "Brand",
    entityId: brand._id,
    summary: `Deleted the unused brand ${brand.name}`,
    before: { name: brand.name, code: brand.code },
    ...(req ? { req } : {}),
  });
}
