/**
 * Products, categories and brands over HTTP (overview §10 A-5, A-6).
 *
 * Uploads are the only thing here that is not JSON: multer keeps the file in memory, `processProductImage`
 * turns it into three WebP renditions, and the handler answers with the URL the editor should store. The file
 * is never written to disk in the shape it arrived in.
 */

import type {
  AdminProductQuery,
  BrandInput,
  BulkProductStatusInput,
  CategoryInput,
  ProductInput,
  ReorderInput,
  StockAdjustInput,
} from "@aib/shared";
import type { Request, Response } from "express";
import { MAX_IMAGES_PER_PRODUCT, processProductImage } from "../lib/images.js";
import { AppError } from "../lib/app-error.js";
import { currentAdmin } from "../middleware/require-admin.js";
import { validated, validatedQuery } from "../middleware/validate.js";
import * as catalogue from "../services/admin-catalogue.service.js";
import * as products from "../services/admin-product.service.js";

// ── Products ────────────────────────────────────────────────────────────────────────────────────────

export async function list(_req: Request, res: Response): Promise<void> {
  res.json(await products.listProducts(validatedQuery<AdminProductQuery>(res)));
}

export async function detail(req: Request, res: Response): Promise<void> {
  res.json(await products.getProduct(String(req.params.id)));
}

export async function create(req: Request, res: Response): Promise<void> {
  const product = await products.createProduct(validated<ProductInput>(res), currentAdmin(req), req);
  res.status(201).json(product);
}

export async function update(req: Request, res: Response): Promise<void> {
  res.json(
    await products.updateProduct(String(req.params.id), validated<ProductInput>(res), currentAdmin(req), req),
  );
}

export async function bulkStatus(req: Request, res: Response): Promise<void> {
  const input = validated<BulkProductStatusInput>(res);
  res.json(await products.setProductStatus(input.ids, input.status, currentAdmin(req), req));
}

export async function adjustStock(req: Request, res: Response): Promise<void> {
  res.json(
    await products.adjustStock(
      String(req.params.id),
      validated<StockAdjustInput>(res),
      currentAdmin(req),
      req,
    ),
  );
}

/**
 * One image at a time. The editor uploads as each file is chosen, so a slow connection shows progress per
 * photo rather than stalling on a batch — and a failure loses one image, not six.
 */
export async function uploadImage(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    throw AppError.badRequest("Choose an image to upload.");
  }

  const folder = String(req.params.folder ?? "products");
  const processed = await processProductImage(file, folder);

  res.status(201).json({
    url: processed.url,
    width: processed.width,
    height: processed.height,
    max: MAX_IMAGES_PER_PRODUCT,
  });
}

// ── Categories and brands ───────────────────────────────────────────────────────────────────────────

export async function categories(_req: Request, res: Response): Promise<void> {
  res.json({ data: await catalogue.listCategories() });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  await catalogue.createCategory(validated<CategoryInput>(res), currentAdmin(req), req);
  res.status(201).json({ data: await catalogue.listCategories() });
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  await catalogue.updateCategory(
    String(req.params.id),
    validated<CategoryInput>(res),
    currentAdmin(req),
    req,
  );
  res.json({ data: await catalogue.listCategories() });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  await catalogue.deleteCategory(String(req.params.id), currentAdmin(req), req);
  res.json({ data: await catalogue.listCategories() });
}

export async function reorderCategories(req: Request, res: Response): Promise<void> {
  const input = validated<ReorderInput>(res);
  res.json({ data: await catalogue.reorderCategories(input.ids, currentAdmin(req), req) });
}

export async function brands(_req: Request, res: Response): Promise<void> {
  res.json({ data: await catalogue.listBrands() });
}

export async function createBrand(req: Request, res: Response): Promise<void> {
  await catalogue.createBrand(validated<BrandInput>(res), currentAdmin(req), req);
  res.status(201).json({ data: await catalogue.listBrands() });
}

export async function updateBrand(req: Request, res: Response): Promise<void> {
  await catalogue.updateBrand(String(req.params.id), validated<BrandInput>(res), currentAdmin(req), req);
  res.json({ data: await catalogue.listBrands() });
}

export async function deleteBrand(req: Request, res: Response): Promise<void> {
  await catalogue.deleteBrand(String(req.params.id), currentAdmin(req), req);
  res.json({ data: await catalogue.listBrands() });
}
