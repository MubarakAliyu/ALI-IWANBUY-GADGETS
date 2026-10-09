/**
 * `?next=` says where to go after signing in. It comes from the URL, so it is attacker-controlled: an open
 * redirect would let a phishing link send someone from our sign-in form to a lookalike site carrying their
 * session in their head.
 *
 * Only a path on this site is ever accepted — one leading slash, no scheme, no second slash, no backslash.
 */

const DEFAULT_NEXT = "/account/orders";

export function safeNext(value: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  if (!value) {
    return fallback;
  }
  const path = value.trim();

  // "//evil.com" and "/\evil.com" are both read as another host by browsers.
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(path)) {
    return fallback;
  }
  return path;
}
