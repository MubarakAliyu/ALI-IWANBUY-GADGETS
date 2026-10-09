/**
 * The catalogue calls the storefront makes, in one place, so a page never builds a URL by hand and the
 * revalidation window is the same everywhere (overview §6.3: public catalogue pages revalidate every 60s).
 */

import type {
  Brand,
  CartValidateRequest,
  CartValidateResponse,
  CategoryNode,
  HomePayload,
  ProductCard,
  ProductDetail,
  ProductListResponse,
  PublicSettings,
  SearchSuggestion,
} from "@aib/shared";
import { apiGetOrNull, apiRequest } from "@/lib/api";

export function getHome(): Promise<HomePayload> {
  return apiRequest<HomePayload>("/catalog/home");
}

export function getCategories(): Promise<CategoryNode[]> {
  return apiRequest<{ data: CategoryNode[] }>("/categories").then((payload) => payload.data);
}

export function getBrands(): Promise<Brand[]> {
  return apiRequest<{ data: Brand[] }>("/brands").then((payload) => payload.data);
}

export function listProducts(query: string): Promise<ProductListResponse> {
  return apiRequest<ProductListResponse>(`/products?${query}`);
}

export function getProduct(slug: string): Promise<ProductDetail | null> {
  return apiGetOrNull<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
}

export function getRelatedProducts(slug: string): Promise<ProductCard[]> {
  return apiRequest<{ data: ProductCard[] }>(`/products/${encodeURIComponent(slug)}/related`).then(
    (payload) => payload.data,
  );
}

export function getPublicSettings(): Promise<PublicSettings | null> {
  return apiGetOrNull<PublicSettings>("/settings/public");
}

export function suggestProducts(query: string, signal?: AbortSignal): Promise<SearchSuggestion[]> {
  return apiRequest<{ data: SearchSuggestion[] }>(`/search/suggest?q=${encodeURIComponent(query)}`, {
    revalidate: false,
    ...(signal ? { signal } : {}),
  }).then((payload) => payload.data);
}

export function validateCart(request: CartValidateRequest): Promise<CartValidateResponse> {
  return apiRequest<CartValidateResponse>("/cart/validate", { method: "POST", body: request });
}

/** Flatten a category tree into the parent and child rows a menu or a filter list shows. */
export function flattenCategories(tree: CategoryNode[]): { slug: string; name: string; depth: 0 | 1 }[] {
  return tree.flatMap((parent) => [
    { slug: parent.slug, name: parent.name, depth: 0 as const },
    ...parent.children.map((child) => ({ slug: child.slug, name: child.name, depth: 1 as const })),
  ]);
}
