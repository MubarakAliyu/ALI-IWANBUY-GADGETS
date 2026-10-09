/**
 * The HTTP layer for the public catalogue: read the request, call a service, send the result. No rule, no
 * query and no money arithmetic lives here (overview §6.2).
 */

import { productListQuerySchema, type CartValidateRequest } from "@aib/shared";
import type { Request, Response } from "express";
import { validated } from "../middleware/validate.js";
import { validateCart } from "../services/cart.service.js";
import * as catalog from "../services/catalog.service.js";

export async function home(_req: Request, res: Response): Promise<void> {
  res.json(await catalog.getHome());
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const query = productListQuerySchema.parse(req.query);
  res.json(await catalog.listProducts(query));
}

export async function productBySlug(req: Request, res: Response): Promise<void> {
  res.json(await catalog.getProductBySlug(String(req.params.slug)));
}

export async function relatedProducts(req: Request, res: Response): Promise<void> {
  res.json({ data: await catalog.getRelatedProducts(String(req.params.slug)) });
}

export async function categories(_req: Request, res: Response): Promise<void> {
  res.json({ data: await catalog.getCategoryTree() });
}

export async function brands(_req: Request, res: Response): Promise<void> {
  res.json({ data: await catalog.listBrands() });
}

export async function searchSuggest(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  res.json({ data: await catalog.suggestProducts(q) });
}

export async function publicSettings(_req: Request, res: Response): Promise<void> {
  res.json(await catalog.getPublicSettings());
}

export async function cartValidate(_req: Request, res: Response): Promise<void> {
  res.json(await validateCart(validated<CartValidateRequest>(res)));
}
