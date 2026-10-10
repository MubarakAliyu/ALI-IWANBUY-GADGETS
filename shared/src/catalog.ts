/**
 * Catalogue contract (overview §7, §11). The API responds with exactly these shapes and the client is typed
 * from them, so a field renamed on the server breaks the build rather than a page.
 *
 * Every amount is integer kobo and says so in its name, so an amount can never be mistaken for naira.
 */

import { z } from "zod";
import { PRODUCT_CONDITION, PRODUCT_SORT } from "./enums.js";

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Not a valid id");
export const slugSchema = z
  .string()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Not a valid slug");

export const imageSchema = z.object({
  url: z.string(),
  alt: z.string(),
  sortOrder: z.number().int().min(0),
});
export type ProductImage = z.infer<typeof imageSchema>;

export const specSchema = z.object({ label: z.string(), value: z.string() });
export type ProductSpec = z.infer<typeof specSchema>;

export const brandSchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  slug: slugSchema,
  logo: z.string().nullable(),
  productCount: z.number().int().min(0).optional(),
});
export type Brand = z.infer<typeof brandSchema>;

export const categorySchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  slug: slugSchema,
  image: z.string().nullable(),
  parent: objectIdSchema.nullable(),
  sortOrder: z.number().int(),
  productCount: z.number().int().min(0).optional(),
});
export type Category = z.infer<typeof categorySchema>;

/** Categories are at most two levels deep (overview §7), so the tree is a category plus its children. */
export type CategoryNode = Category & { children: Category[] };

export const categoryNodeSchema = categorySchema.extend({
  children: z.array(categorySchema),
});

export const variantSchema = z.object({
  id: objectIdSchema,
  sku: z.string(),
  label: z.string(),
  attributes: z.object({
    storage: z.string().nullable(),
    colour: z.string().nullable(),
    ram: z.string().nullable(),
  }),
  priceKobo: z.number().int().min(0),
  compareAtPriceKobo: z.number().int().min(0).nullable(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
});
export type Variant = z.infer<typeof variantSchema>;

/** What a product card needs and nothing more, so the list endpoint stays small. */
export const productCardSchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  slug: slugSchema,
  brand: z.object({ id: objectIdSchema, name: z.string(), slug: slugSchema }),
  category: z.object({ id: objectIdSchema, name: z.string(), slug: slugSchema }),
  image: imageSchema.nullable(),
  condition: z.enum(PRODUCT_CONDITION),
  priceFromKobo: z.number().int().min(0),
  compareAtPriceKobo: z.number().int().min(0).nullable(),
  totalStock: z.number().int().min(0),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  variantCount: z.number().int().min(1),
  /**
   * The cheapest active variant. A card can add it to the cart in one click when it is the only one; when a
   * product has several, the card sends the customer to the page to choose.
   */
  defaultVariant: z.object({
    id: objectIdSchema,
    sku: z.string(),
    label: z.string(),
    priceKobo: z.number().int().min(0),
    stock: z.number().int().min(0),
  }),
});
export type ProductCard = z.infer<typeof productCardSchema>;

export const productDetailSchema = productCardSchema.extend({
  shortDescription: z.string(),
  description: z.string(),
  highlights: z.array(z.string()),
  specs: z.array(specSchema),
  images: z.array(imageSchema),
  warrantyMonths: z.number().int().min(0),
  tags: z.array(z.string()),
  variants: z.array(variantSchema).min(1),
});
export type ProductDetail = z.infer<typeof productDetailSchema>;

export const productListResponseSchema = z.object({
  data: z.array(productCardSchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  pages: z.number().int().min(0),
});
export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const PRODUCT_PAGE_SIZE = 24;
export const PRODUCT_PAGE_SIZE_MAX = 48;
export const PRODUCT_PAGE_MAX = 1000;

/** A comma-separated query parameter (`brand=apple,samsung`) as a de-duplicated list of slugs. */
const slugListSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.split(",")))
  .pipe(
    z
      .array(z.string())
      .transform((list) => [...new Set(list.map((item) => item.trim().toLowerCase()).filter(Boolean))]),
  );

/**
 * The product list query as it arrives in a URL. Every field is optional and a nonsense value falls back to a
 * sane default instead of erroring: a hand-edited URL should still show products (AC1.2).
 */
export const productListQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional().catch(undefined),
  category: slugSchema.optional().catch(undefined),
  brand: slugListSchema.optional().catch(undefined),
  condition: z.enum(PRODUCT_CONDITION).optional().catch(undefined),
  minPriceKobo: z.coerce.number().int().min(0).optional().catch(undefined),
  maxPriceKobo: z.coerce.number().int().min(0).optional().catch(undefined),
  inStock: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "1")
    .optional()
    .catch(undefined),
  featured: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "1")
    .optional()
    .catch(undefined),
  sort: z.enum(PRODUCT_SORT).catch("newest"),
  page: z.coerce.number().int().min(1).max(PRODUCT_PAGE_MAX).catch(1),
  limit: z.coerce.number().int().min(1).max(PRODUCT_PAGE_SIZE_MAX).catch(PRODUCT_PAGE_SIZE),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const searchSuggestionSchema = z.object({
  name: z.string(),
  slug: slugSchema,
  brand: z.string(),
  image: z.string().nullable(),
  priceFromKobo: z.number().int().min(0),
});
export type SearchSuggestion = z.infer<typeof searchSuggestionSchema>;

export const homePayloadSchema = z.object({
  featured: z.array(productCardSchema),
  newArrivals: z.array(productCardSchema),
  categories: z.array(categoryNodeSchema),
  brands: z.array(brandSchema),
});
export type HomePayload = z.infer<typeof homePayloadSchema>;

/** When the shop is open, as the owner keeps it in Store Settings. */
export const openingHoursSchema = z.object({
  days: z.string(),
  opens: z.string(),
  closes: z.string(),
});
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const publicSettingsSchema = z.object({
  storeName: z.string(),
  legalName: z.string(),
  rcNumber: z.string(),
  tin: z.string(),
  registeredAddress: z.string(),
  shopAddress: z.string(),
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string(),
  deliveryFees: z.object({
    localKobo: z.number().int().min(0),
    nationwideKobo: z.number().int().min(0),
  }),
  freeDeliveryThresholdKobo: z.number().int().min(0).nullable(),
  openingHours: z.array(openingHoursSchema),
});
export type PublicSettings = z.infer<typeof publicSettingsSchema>;

/** `POST /cart/validate` — the server re-prices a cart from the database before checkout (S-6). */
export const cartValidateRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectIdSchema,
        variantId: objectIdSchema,
        qty: z.number().int().min(1).max(99),
        /** What the browser last saw this line cost, so the server can report a price that has moved. */
        unitPriceKobo: z.number().int().min(0).optional(),
      }),
    )
    .max(50),
});
export type CartValidateRequest = z.infer<typeof cartValidateRequestSchema>;

export const CART_ISSUE = ["REMOVED", "OUT_OF_STOCK", "QTY_REDUCED", "PRICE_CHANGED"] as const;
export type CartIssue = (typeof CART_ISSUE)[number];

export const cartValidateResponseSchema = z.object({
  items: z.array(
    z.object({
      productId: objectIdSchema,
      variantId: objectIdSchema,
      name: z.string(),
      slug: slugSchema,
      variantLabel: z.string(),
      sku: z.string(),
      image: z.string().nullable(),
      unitPriceKobo: z.number().int().min(0),
      qty: z.number().int().min(0),
      stock: z.number().int().min(0),
      lineTotalKobo: z.number().int().min(0),
    }),
  ),
  issues: z.array(
    z.object({
      productId: objectIdSchema,
      variantId: objectIdSchema,
      name: z.string(),
      issue: z.enum(CART_ISSUE),
      previousQty: z.number().int().min(0).optional(),
      previousUnitPriceKobo: z.number().int().min(0).optional(),
    }),
  ),
  subtotalKobo: z.number().int().min(0),
});
export type CartValidateResponse = z.infer<typeof cartValidateResponseSchema>;
export type CartValidatedItem = CartValidateResponse["items"][number];
export type CartReportedIssue = CartValidateResponse["issues"][number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
