/**
 * One shape for every list response (overview §11): `{ data, page, limit, total, pages }`.
 */

export type Paginated<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export function paginate<T>(data: T[], total: number, page: number, limit: number): Paginated<T> {
  return { data, page, limit, total, pages: limit > 0 ? Math.ceil(total / limit) : 0 };
}

/** How many documents to skip for a page, clamped so a silly page number cannot produce a negative skip. */
export function skipFor(page: number, limit: number): number {
  return Math.max(0, (page - 1) * limit);
}
