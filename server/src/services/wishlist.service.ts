/**
 * The wishlist (S-7). It is a list of product ids on the customer, not a collection of its own: it is small,
 * it is always read with the customer, and it has no state beyond membership.
 */

import type { ProductCard } from "@aib/shared";
import type { Request } from "express";
import { AppError } from "../lib/app-error.js";
import { Customer, Product } from "../models/index.js";
import { productCardsByIds } from "./catalog.service.js";
import { recordAudit } from "./audit.service.js";

const MAX_WISHLIST = 100;

export async function getWishlist(customerId: string): Promise<ProductCard[]> {
  const customer = await Customer.findById(customerId).select("wishlist").lean().exec();
  if (!customer) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }
  return productCardsByIds(customer.wishlist.map((id) => id.toString()));
}

export async function addToWishlist(
  customerId: string,
  productId: string,
  req?: Request,
): Promise<{ count: number }> {
  const product = await Product.findOne({ _id: productId, status: "ACTIVE" }).select("name").lean().exec();
  if (!product) {
    throw AppError.notFound("That product is not available.");
  }

  const customer = await Customer.findById(customerId).select("wishlist firstName lastName").exec();
  if (!customer) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  const already = customer.wishlist.some((id) => id.toString() === productId);
  if (!already) {
    if (customer.wishlist.length >= MAX_WISHLIST) {
      throw new AppError(
        409,
        "WISHLIST_FULL",
        `A wishlist holds up to ${MAX_WISHLIST} products. Remove one to save another.`,
      );
    }
    customer.wishlist.push(product._id);
    await customer.save();

    await recordAudit({
      actorType: "CUSTOMER",
      actor: customer._id,
      actorName: `${customer.firstName} ${customer.lastName}`,
      action: "WISHLIST_ADDED",
      entityType: "Product",
      entityId: product._id,
      summary: `Saved ${product.name} to their wishlist`,
      ...(req ? { req } : {}),
    });
  }

  return { count: customer.wishlist.length };
}

export async function removeFromWishlist(
  customerId: string,
  productId: string,
  req?: Request,
): Promise<{ count: number }> {
  const customer = await Customer.findById(customerId).select("wishlist firstName lastName").exec();
  if (!customer) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  const before = customer.wishlist.length;
  customer.wishlist = customer.wishlist.filter((id) => id.toString() !== productId);

  if (customer.wishlist.length !== before) {
    await customer.save();
    await recordAudit({
      actorType: "CUSTOMER",
      actor: customer._id,
      actorName: `${customer.firstName} ${customer.lastName}`,
      action: "WISHLIST_REMOVED",
      entityType: "Product",
      entityId: productId,
      summary: "Removed a product from their wishlist",
      ...(req ? { req } : {}),
    });
  }

  return { count: customer.wishlist.length };
}
