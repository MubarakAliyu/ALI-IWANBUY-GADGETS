/**
 * The account area over HTTP: profile, password, addresses, wishlist and the server cart. Each handler reads
 * the signed-in customer, calls one service, and sends what it returns.
 */

import type { AddressInput, ChangePasswordInput, ProfileInput, SaveCartInput } from "@aib/shared";
import type { Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import { setCustomerCookie } from "../lib/tokens.js";
import { currentCustomer } from "../middleware/require-customer.js";
import { validated } from "../middleware/validate.js";
import * as account from "../services/account.service.js";
import * as cart from "../services/customer-cart.service.js";
import * as wishlist from "../services/wishlist.service.js";

/**
 * The email address identifies every order a customer has placed, so no route may change it. The request is
 * refused outright rather than quietly ignoring the field, so nobody is left believing it worked (AC2.1).
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (req.body && typeof req.body === "object" && "email" in req.body) {
    throw new AppError(
      400,
      "EMAIL_IMMUTABLE",
      "Your email address cannot be changed. Please call the shop if it is wrong.",
      [{ path: "email", message: "Your email address cannot be changed" }],
    );
  }

  const customer = currentCustomer(req);
  res.json({
    customer: await account.updateProfile(customer._id.toString(), validated<ProfileInput>(res), req),
  });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const signedIn = currentCustomer(req);
  const { customer, dto } = await account.changePassword(
    signedIn._id.toString(),
    validated<ChangePasswordInput>(res),
    req,
  );

  // This session stays signed in with a cookie for the new token version; every other one is now stale.
  setCustomerCookie(res, customer._id.toString(), customer.tokenVersion);
  res.json({ customer: dto });
}

export async function listAddresses(req: Request, res: Response): Promise<void> {
  res.json({ data: await account.listAddresses(currentCustomer(req)._id.toString()) });
}

export async function addAddress(req: Request, res: Response): Promise<void> {
  const data = await account.addAddress(
    currentCustomer(req)._id.toString(),
    validated<AddressInput>(res),
    req,
  );
  res.status(201).json({ data });
}

export async function updateAddress(req: Request, res: Response): Promise<void> {
  const data = await account.updateAddress(
    currentCustomer(req)._id.toString(),
    String(req.params.id),
    validated<AddressInput>(res),
    req,
  );
  res.json({ data });
}

export async function deleteAddress(req: Request, res: Response): Promise<void> {
  const data = await account.deleteAddress(currentCustomer(req)._id.toString(), String(req.params.id), req);
  res.json({ data });
}

export async function setDefaultAddress(req: Request, res: Response): Promise<void> {
  const data = await account.setDefaultAddress(
    currentCustomer(req)._id.toString(),
    String(req.params.id),
    req,
  );
  res.json({ data });
}

export async function getWishlist(req: Request, res: Response): Promise<void> {
  res.json({ data: await wishlist.getWishlist(currentCustomer(req)._id.toString()) });
}

export async function addToWishlist(req: Request, res: Response): Promise<void> {
  res.json(
    await wishlist.addToWishlist(currentCustomer(req)._id.toString(), String(req.params.productId), req),
  );
}

export async function removeFromWishlist(req: Request, res: Response): Promise<void> {
  res.json(
    await wishlist.removeFromWishlist(currentCustomer(req)._id.toString(), String(req.params.productId), req),
  );
}

export async function getCart(req: Request, res: Response): Promise<void> {
  res.json(await cart.getCart(currentCustomer(req)._id.toString()));
}

export async function saveCart(req: Request, res: Response): Promise<void> {
  res.json(await cart.saveCart(currentCustomer(req)._id.toString(), validated<SaveCartInput>(res)));
}

export async function mergeCart(req: Request, res: Response): Promise<void> {
  res.json(await cart.mergeCart(currentCustomer(req)._id.toString(), validated<SaveCartInput>(res)));
}
