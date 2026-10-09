/**
 * The shop's categories and brands (overview §13). Categories are two levels deep at most; the images are the
 * approved brand photos that `scripts/prepare-images.mjs` prepares into `client/public/images`.
 */

export type SeedCategory = {
  name: string;
  slug: string;
  image: string | null;
  children?: { name: string; slug: string }[];
};

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: "Phones",
    slug: "phones",
    image: "/images/phones.webp",
    children: [
      { name: "iPhone", slug: "iphone" },
      { name: "Android", slug: "android" },
    ],
  },
  { name: "Tablets", slug: "tablets", image: "/images/product-podium.webp" },
  { name: "Laptops", slug: "laptops", image: "/images/apple-devices.webp" },
  { name: "Smartwatches", slug: "smartwatches", image: "/images/tech-futuristic.webp" },
  {
    name: "Audio",
    slug: "audio",
    image: "/images/headphones.webp",
    children: [
      { name: "Earbuds", slug: "earbuds" },
      { name: "Headphones", slug: "headphones" },
      { name: "Speakers", slug: "speakers" },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    image: "/images/phone-case.webp",
    children: [
      { name: "Chargers & Cables", slug: "chargers-and-cables" },
      { name: "Cases & Protection", slug: "cases-and-protection" },
      { name: "Power Banks", slug: "power-banks" },
      { name: "Memory", slug: "memory" },
    ],
  },
];

export type SeedBrand = { name: string; slug: string; code: string };

export const SEED_BRANDS: SeedBrand[] = [
  { name: "Apple", slug: "apple", code: "APL" },
  { name: "Samsung", slug: "samsung", code: "SAM" },
  { name: "Tecno", slug: "tecno", code: "TCN" },
  { name: "Infinix", slug: "infinix", code: "INF" },
  { name: "Xiaomi", slug: "xiaomi", code: "XIA" },
  { name: "Oppo", slug: "oppo", code: "OPP" },
  { name: "itel", slug: "itel", code: "ITL" },
  { name: "Nokia", slug: "nokia", code: "NOK" },
  { name: "Oraimo", slug: "oraimo", code: "ORM" },
  { name: "Anker", slug: "anker", code: "ANK" },
  { name: "JBL", slug: "jbl", code: "JBL" },
  { name: "Generic", slug: "generic", code: "GEN" },
];
