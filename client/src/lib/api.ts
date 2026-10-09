/**
 * The one way this app talks to the API (overview §6.3).
 *
 * In the browser the request is relative (`/api/v1/…`) and the Next.js rewrite forwards it, so cookies stay
 * first-party. On the server there is no origin to be relative to, so the call goes straight to `API_ORIGIN`
 * and carries the incoming cookie header with it.
 */

import type { ApiError } from "@aib/shared";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";
const isServer = typeof window === "undefined";

export class ApiRequestError extends Error {
  override name = "ApiRequestError";
  readonly status: number;
  readonly code: string;
  readonly fields: { path: string; message: string }[] | undefined;

  constructor(status: number, code: string, message: string, fields?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  /** True when the resource simply is not there, so a page can render its own not-found state. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Seconds to cache a GET for. Catalogue pages revalidate every 60s (overview §6.3). */
  revalidate?: number | false;
  /**
   * Pass the visitor's session cookie through to the API when rendering on the server.
   *
   * Off by default, and deliberately so: reading the incoming headers makes a page dynamic, which would stop
   * the catalogue pages being cached and re-rendered on a schedule. Only a call that depends on who is asking
   * — the account and checkout pages from Batch 2 — turns it on.
   */
  forwardCookies?: boolean;
  signal?: AbortSignal;
};

async function resolveUrl(path: string): Promise<string> {
  if (!isServer) {
    return `/api/v1${path}`;
  }
  return `${API_ORIGIN}/api/v1${path}`;
}

async function serverHeaders(forward: boolean): Promise<Record<string, string>> {
  if (!isServer || !forward) {
    return {};
  }
  // Imported lazily so the client bundle never pulls in next/headers.
  const { headers } = await import("next/headers");
  const cookie = (await headers()).get("cookie");
  return cookie ? { cookie } : {};
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const url = await resolveUrl(path);

  const init: RequestInit & { next?: { revalidate: number | false } } = {
    method,
    headers: {
      accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(await serverHeaders(options.forwardCookies ?? false)),
    },
    credentials: "include",
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(options.signal ? { signal: options.signal } : {}),
  };

  if (method === "GET") {
    init.next = { revalidate: options.revalidate ?? 60 };
  } else {
    init.cache = "no-store";
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      response.status,
      payload?.error.code ?? "REQUEST_FAILED",
      payload?.error.message ?? `The request failed (${response.status}).`,
      payload?.error.fields,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** A GET whose 404 is an expected answer — returns `null` instead of throwing. */
export async function apiGetOrNull<T>(path: string, options: ApiRequestOptions = {}): Promise<T | null> {
  try {
    return await apiRequest<T>(path, options);
  } catch (error) {
    if (error instanceof ApiRequestError && error.isNotFound) {
      return null;
    }
    throw error;
  }
}
