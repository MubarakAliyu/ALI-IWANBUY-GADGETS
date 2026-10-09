/**
 * The customer-area calls, in one place (overview §6.3). Anything that depends on who is asking forwards the
 * session cookie when it runs on the server, and never caches.
 */

import type {
  Address,
  AddressInput,
  ChangePasswordInput,
  CheckoutSettings,
  Customer,
  LoginInput,
  OrderDetail,
  OrderListResponse,
  OrderStatus,
  PlaceOrderInput,
  ProductCard,
  ProfileInput,
  RegisterInput,
  SaveCartInput,
  ServerCart,
  Session,
} from "@aib/shared";
import { apiRequest } from "@/lib/api";

/** Private data is never cached and always carries the cookie. */
const PRIVATE = { revalidate: false as const, forwardCookies: true };

export function getSession(): Promise<Session> {
  return apiRequest<Session>("/auth/me", PRIVATE);
}

export function register(input: RegisterInput): Promise<{ customer: Customer }> {
  return apiRequest<{ customer: Customer }>("/auth/register", { method: "POST", body: input });
}

export function login(input: LoginInput): Promise<{ customer: Customer }> {
  return apiRequest<{ customer: Customer }>("/auth/login", { method: "POST", body: input });
}

export function logout(): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export function updateProfile(input: ProfileInput): Promise<{ customer: Customer }> {
  return apiRequest<{ customer: Customer }>("/me/profile", { method: "PATCH", body: input });
}

export function changePassword(input: ChangePasswordInput): Promise<{ customer: Customer }> {
  return apiRequest<{ customer: Customer }>("/me/password", { method: "POST", body: input });
}

export function addAddress(input: AddressInput): Promise<{ data: Address[] }> {
  return apiRequest<{ data: Address[] }>("/me/addresses", { method: "POST", body: input });
}

export function updateAddress(id: string, input: AddressInput): Promise<{ data: Address[] }> {
  return apiRequest<{ data: Address[] }>(`/me/addresses/${id}`, { method: "PATCH", body: input });
}

export function deleteAddress(id: string): Promise<{ data: Address[] }> {
  return apiRequest<{ data: Address[] }>(`/me/addresses/${id}`, { method: "DELETE" });
}

export function setDefaultAddress(id: string): Promise<{ data: Address[] }> {
  return apiRequest<{ data: Address[] }>(`/me/addresses/${id}/default`, { method: "POST" });
}

export function getWishlist(): Promise<{ data: ProductCard[] }> {
  return apiRequest<{ data: ProductCard[] }>("/me/wishlist", PRIVATE);
}

export function addToWishlist(productId: string): Promise<{ count: number }> {
  return apiRequest<{ count: number }>(`/me/wishlist/${productId}`, { method: "POST" });
}

export function removeFromWishlist(productId: string): Promise<{ count: number }> {
  return apiRequest<{ count: number }>(`/me/wishlist/${productId}`, { method: "DELETE" });
}

export function getServerCart(): Promise<ServerCart> {
  return apiRequest<ServerCart>("/me/cart", PRIVATE);
}

export function saveServerCart(input: SaveCartInput): Promise<ServerCart> {
  return apiRequest<ServerCart>("/me/cart", { method: "PUT", body: input });
}

export function mergeServerCart(input: SaveCartInput): Promise<ServerCart> {
  return apiRequest<ServerCart>("/me/cart/merge", { method: "POST", body: input });
}

export function getCheckoutSettings(): Promise<CheckoutSettings> {
  return apiRequest<CheckoutSettings>("/checkout/settings", { revalidate: 60 });
}

export function placeOrder(input: PlaceOrderInput): Promise<OrderDetail> {
  return apiRequest<OrderDetail>("/orders", { method: "POST", body: input });
}

export function listOrders(params: { status?: OrderStatus; page?: number } = {}): Promise<OrderListResponse> {
  const query = new URLSearchParams();
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.page && params.page > 1) {
    query.set("page", String(params.page));
  }
  const suffix = query.toString();
  return apiRequest<OrderListResponse>(`/orders${suffix ? `?${suffix}` : ""}`, PRIVATE);
}

export function getOrder(orderNumber: string): Promise<OrderDetail> {
  return apiRequest<OrderDetail>(`/orders/${encodeURIComponent(orderNumber)}`, PRIVATE);
}

export function declareTransfer(orderNumber: string, reference?: string): Promise<OrderDetail> {
  return apiRequest<OrderDetail>(`/orders/${encodeURIComponent(orderNumber)}/transfer-made`, {
    method: "POST",
    body: reference ? { reference } : {},
  });
}

export function cancelOrder(orderNumber: string, reason?: string): Promise<OrderDetail> {
  return apiRequest<OrderDetail>(`/orders/${encodeURIComponent(orderNumber)}/cancel`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}
