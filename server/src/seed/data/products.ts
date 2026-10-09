/**
 * The seeded catalogue (overview §13): phones, tablets, laptops, watches, audio and accessories at prices a
 * Birnin Kebbi customer would recognise. Prices are written in whole naira here for readability and converted
 * to integer kobo by the seed runner — nothing downstream ever sees naira.
 *
 * A handful of variants are deliberately low on stock and one product is out of stock, so the storefront's
 * stock states and the dashboard's low-stock tile have something real to show.
 */

import type { ProductCondition } from "@aib/shared";
import type { Silhouette } from "../placeholder-image.js";

export type SeedVariant = {
  label: string;
  storage?: string;
  colour?: string;
  ram?: string;
  priceNaira: number;
  compareAtNaira?: number;
  stock: number;
  lowStockThreshold?: number;
};

export type SeedProduct = {
  name: string;
  brand: string;
  category: string;
  silhouette: Silhouette;
  condition?: ProductCondition;
  warrantyMonths: number;
  shortDescription: string;
  description: string;
  highlights: string[];
  specs: [string, string][];
  tags: string[];
  featured?: boolean;
  newArrival?: boolean;
  variants: SeedVariant[];
};

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: "Apple iPhone 15",
    brand: "apple",
    category: "iphone",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "USB-C, the 48MP Main camera and the Dynamic Island, sealed in the box.",
    description:
      "The iPhone 15 brings USB-C charging, a 48MP Main camera that keeps detail when you crop, and the Dynamic Island in place of the notch. Sold sealed with a one-year warranty, activated and tested in the shop before you leave.",
    highlights: [
      "6.1-inch Super Retina XDR display",
      "48MP Main camera with 2x telephoto crop",
      "USB-C charging and data",
      "Face ID and Apple Pay",
    ],
    specs: [
      ["Display", "6.1-inch Super Retina XDR, 60Hz"],
      ["Chip", "A16 Bionic"],
      ["Rear camera", "48MP Main + 12MP Ultra Wide"],
      ["Front camera", "12MP TrueDepth"],
      ["Battery", "Up to 20 hours video playback"],
      ["SIM", "Nano-SIM and eSIM"],
    ],
    tags: ["iphone", "apple", "5g", "sealed"],
    featured: true,
    newArrival: true,
    variants: [
      { label: "128GB · Black", storage: "128GB", colour: "Black", priceNaira: 1_250_000, stock: 6 },
      { label: "128GB · Blue", storage: "128GB", colour: "Blue", priceNaira: 1_250_000, stock: 4 },
      { label: "256GB · Black", storage: "256GB", colour: "Black", priceNaira: 1_420_000, stock: 3 },
    ],
  },
  {
    name: "Apple iPhone 13 Pro Max",
    brand: "apple",
    category: "iphone",
    silhouette: "phone",
    warrantyMonths: 6,
    shortDescription: "The 120Hz ProMotion flagship, still the best battery Apple has shipped.",
    description:
      "A 6.7-inch ProMotion display, the three-camera Pro system with 3x telephoto, and a battery that comfortably lasts a full working day. Every unit is battery-health checked before it goes on the shelf.",
    highlights: [
      "6.7-inch ProMotion display, 120Hz",
      "Pro camera system with 3x telephoto",
      "Battery health 88% or better, stated per unit",
      "Six-month shop warranty",
    ],
    specs: [
      ["Display", "6.7-inch Super Retina XDR, 120Hz"],
      ["Chip", "A15 Bionic"],
      ["Rear camera", "12MP Main + Ultra Wide + 3x Telephoto"],
      ["Battery", "Up to 28 hours video playback"],
      ["Water resistance", "IP68"],
    ],
    tags: ["iphone", "apple", "pro max", "flagship"],
    featured: true,
    variants: [
      {
        label: "128GB · Graphite",
        storage: "128GB",
        colour: "Graphite",
        priceNaira: 1_050_000,
        compareAtNaira: 1_180_000,
        stock: 5,
      },
      {
        label: "256GB · Sierra Blue",
        storage: "256GB",
        colour: "Sierra Blue",
        priceNaira: 1_180_000,
        stock: 2,
      },
    ],
  },
  {
    name: "Apple iPhone 12",
    brand: "apple",
    category: "iphone",
    silhouette: "phone",
    condition: "UK_USED",
    warrantyMonths: 3,
    shortDescription: "Clean UK used iPhone 12 — the value pick that still gets every iOS update.",
    description:
      "A tidy UK used iPhone 12 with the flat-edge design, OLED display and MagSafe charging. Each one is screen-tested, battery-health checked and sold with a three-month shop warranty.",
    highlights: [
      "6.1-inch Super Retina XDR OLED",
      "MagSafe charging",
      "Battery health 85% or better",
      "Face ID tested",
    ],
    specs: [
      ["Display", "6.1-inch Super Retina XDR"],
      ["Chip", "A14 Bionic"],
      ["Rear camera", "12MP Main + 12MP Ultra Wide"],
      ["Condition", "UK used, grade A"],
    ],
    tags: ["iphone", "apple", "uk used", "budget"],
    variants: [
      { label: "64GB · White", storage: "64GB", colour: "White", priceNaira: 620_000, stock: 4 },
      { label: "128GB · Black", storage: "128GB", colour: "Black", priceNaira: 690_000, stock: 3 },
    ],
  },
  {
    name: "Apple iPhone 11",
    brand: "apple",
    category: "iphone",
    silhouette: "phone",
    condition: "UK_USED",
    warrantyMonths: 3,
    shortDescription: "Still the best-selling iPhone in the shop — dependable and affordable.",
    description:
      "The iPhone 11 remains the easiest way into iOS. Liquid Retina display, dual cameras and a battery that lasts. Checked, cleaned and warrantied for three months.",
    highlights: [
      "6.1-inch Liquid Retina display",
      "Dual 12MP camera with Night mode",
      "Face ID",
      "Three-month warranty",
    ],
    specs: [
      ["Display", "6.1-inch Liquid Retina HD"],
      ["Chip", "A13 Bionic"],
      ["Rear camera", "12MP Main + 12MP Ultra Wide"],
      ["Condition", "UK used, grade A"],
    ],
    tags: ["iphone", "apple", "uk used"],
    variants: [{ label: "64GB · Black", storage: "64GB", colour: "Black", priceNaira: 460_000, stock: 2 }],
  },
  {
    name: "Apple iPhone XR",
    brand: "apple",
    category: "iphone",
    silhouette: "phone",
    condition: "UK_USED",
    warrantyMonths: 3,
    shortDescription: "An honest entry-level iPhone with a big screen and a battery that keeps going.",
    description:
      "The iPhone XR pairs a 6.1-inch Liquid Retina display with the A12 chip and genuinely long battery life. A sensible first iPhone, sold tested with a three-month warranty.",
    highlights: [
      "6.1-inch Liquid Retina display",
      "A12 Bionic chip",
      "Single 12MP camera with Portrait mode",
    ],
    specs: [
      ["Display", "6.1-inch Liquid Retina HD"],
      ["Chip", "A12 Bionic"],
      ["Condition", "UK used, grade B"],
    ],
    tags: ["iphone", "apple", "uk used", "entry"],
    variants: [{ label: "64GB · Coral", storage: "64GB", colour: "Coral", priceNaira: 330_000, stock: 3 }],
  },
  {
    name: "Samsung Galaxy S23 Ultra",
    brand: "samsung",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "200MP camera, built-in S Pen and the brightest screen Samsung makes.",
    description:
      "The S23 Ultra is the Android flagship to beat: a 200MP main camera, 10x optical zoom, the S Pen tucked into the body, and a 5,000mAh battery. Sealed, with a one-year warranty.",
    highlights: [
      "6.8-inch Dynamic AMOLED 2X, 120Hz",
      "200MP main camera, 10x optical zoom",
      "S Pen built in",
      "5,000mAh battery with 45W charging",
    ],
    specs: [
      ["Display", "6.8-inch QHD+ Dynamic AMOLED 2X"],
      ["Chip", "Snapdragon 8 Gen 2 for Galaxy"],
      ["Rear camera", "200MP + 12MP + 10MP + 10MP"],
      ["Battery", "5,000mAh, 45W wired"],
      ["Water resistance", "IP68"],
    ],
    tags: ["samsung", "galaxy", "s pen", "flagship", "5g"],
    featured: true,
    variants: [
      {
        label: "256GB · Phantom Black",
        storage: "256GB",
        colour: "Phantom Black",
        priceNaira: 1_350_000,
        stock: 4,
      },
      { label: "512GB · Cream", storage: "512GB", colour: "Cream", priceNaira: 1_560_000, stock: 2 },
    ],
  },
  {
    name: "Samsung Galaxy A15",
    brand: "samsung",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "A big AMOLED screen and a two-day battery for well under three hundred thousand.",
    description:
      "The A15 is the phone most customers leave with: a 6.5-inch AMOLED display, a 50MP camera and a 5,000mAh battery that genuinely lasts two days of normal use. Sealed with a one-year Samsung warranty.",
    highlights: ["6.5-inch Super AMOLED, 90Hz", "50MP main camera", "5,000mAh battery", "Dual SIM"],
    specs: [
      ["Display", "6.5-inch Super AMOLED, 90Hz"],
      ["Chip", "MediaTek Helio G99"],
      ["Rear camera", "50MP + 5MP + 2MP"],
      ["Battery", "5,000mAh, 25W charging"],
    ],
    tags: ["samsung", "galaxy", "budget", "amoled"],
    variants: [
      { label: "128GB · Blue Black", storage: "128GB", colour: "Blue Black", priceNaira: 285_000, stock: 12 },
      { label: "256GB · Light Blue", storage: "256GB", colour: "Light Blue", priceNaira: 330_000, stock: 7 },
    ],
  },
  {
    name: "Samsung Galaxy A25 5G",
    brand: "samsung",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "5G, optical image stabilisation and a 120Hz screen in the mid-range.",
    description:
      "The A25 adds 5G and optical image stabilisation to the A-series recipe, with a 120Hz Super AMOLED display that makes everything feel quicker. Sealed, one-year warranty.",
    highlights: ["6.5-inch Super AMOLED, 120Hz", "50MP camera with OIS", "5G", "5,000mAh battery"],
    specs: [
      ["Display", "6.5-inch Super AMOLED, 120Hz"],
      ["Chip", "Exynos 1280"],
      ["Rear camera", "50MP OIS + 8MP + 2MP"],
      ["Network", "5G"],
    ],
    tags: ["samsung", "galaxy", "5g", "mid-range"],
    newArrival: true,
    variants: [{ label: "128GB · Blue", storage: "128GB", colour: "Blue", priceNaira: 395_000, stock: 8 }],
  },
  {
    name: "Tecno Camon 30",
    brand: "tecno",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "A 50MP selfie camera and 70W charging — the camera phone of the shop.",
    description:
      "The Camon 30 is built around its cameras: 50MP front and back, with a bright 120Hz AMOLED display and 70W charging that fills the battery over a lunch break.",
    highlights: [
      "6.78-inch AMOLED, 120Hz",
      "50MP rear and 50MP front cameras",
      "70W fast charging",
      "8GB RAM",
    ],
    specs: [
      ["Display", "6.78-inch AMOLED, 120Hz"],
      ["Chip", "MediaTek Helio G99 Ultimate"],
      ["Rear camera", "50MP + 2MP"],
      ["Charging", "70W wired"],
    ],
    tags: ["tecno", "camon", "camera", "fast charging"],
    featured: true,
    variants: [
      {
        label: "256GB · 8GB RAM",
        storage: "256GB",
        ram: "8GB",
        colour: "Basaltic Dark",
        priceNaira: 395_000,
        compareAtNaira: 430_000,
        stock: 9,
      },
    ],
  },
  {
    name: "Tecno Spark 20",
    brand: "tecno",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "A 90Hz screen and a 32MP selfie camera at an entry-level price.",
    description:
      "The Spark 20 punches above its price: a 6.6-inch 90Hz display, a 50MP main camera and a 32MP dual-flash selfie camera, with a battery that sees out the day.",
    highlights: ["6.6-inch HD+ display, 90Hz", "50MP main camera", "32MP selfie camera", "5,000mAh battery"],
    specs: [
      ["Display", "6.6-inch HD+, 90Hz"],
      ["Chip", "MediaTek Helio G85"],
      ["Battery", "5,000mAh, 18W"],
    ],
    tags: ["tecno", "spark", "budget"],
    newArrival: true,
    variants: [
      {
        label: "128GB · 8GB RAM",
        storage: "128GB",
        ram: "8GB",
        colour: "Gravity Black",
        priceNaira: 165_000,
        stock: 15,
      },
      {
        label: "256GB · 8GB RAM",
        storage: "256GB",
        ram: "8GB",
        colour: "Magic Skin Green",
        priceNaira: 195_000,
        stock: 6,
      },
    ],
  },
  {
    name: "Infinix Hot 40i",
    brand: "infinix",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "The budget workhorse — big battery, big screen, small price.",
    description:
      "The Hot 40i covers the basics properly: a 6.56-inch 90Hz display, a 50MP camera and a 5,000mAh battery, with dual speakers that are genuinely loud.",
    highlights: ["6.56-inch HD+ display, 90Hz", "50MP main camera", "5,000mAh battery", "Dual speakers"],
    specs: [
      ["Display", "6.56-inch HD+, 90Hz"],
      ["Chip", "Unisoc T606"],
      ["Battery", "5,000mAh, 18W"],
    ],
    tags: ["infinix", "hot", "budget", "big battery"],
    variants: [
      {
        label: "128GB · 4GB RAM",
        storage: "128GB",
        ram: "4GB",
        colour: "Starlit Black",
        priceNaira: 155_000,
        stock: 18,
      },
      {
        label: "256GB · 8GB RAM",
        storage: "256GB",
        ram: "8GB",
        colour: "Palm Blue",
        priceNaira: 180_000,
        stock: 10,
      },
    ],
  },
  {
    name: "Infinix Note 40",
    brand: "infinix",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "45W all-round fast charging and a 108MP camera.",
    description:
      "The Note 40 brings flagship charging to the mid-range: 45W wired, wireless charging support, a 108MP main camera and a 120Hz AMOLED display.",
    highlights: ["6.78-inch AMOLED, 120Hz", "108MP main camera", "45W all-round fast charging", "8GB RAM"],
    specs: [
      ["Display", "6.78-inch AMOLED, 120Hz"],
      ["Chip", "MediaTek Helio G99 Ultimate"],
      ["Rear camera", "108MP + 2MP + 2MP"],
      ["Charging", "45W wired"],
    ],
    tags: ["infinix", "note", "fast charging"],
    newArrival: true,
    variants: [
      {
        label: "256GB · 8GB RAM",
        storage: "256GB",
        ram: "8GB",
        colour: "Obsidian Black",
        priceNaira: 385_000,
        stock: 5,
      },
    ],
  },
  {
    name: "Xiaomi Redmi Note 13",
    brand: "xiaomi",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "108MP camera, 120Hz AMOLED — the mid-range value champion.",
    description:
      "The Redmi Note 13 is the phone to beat under ₦300,000: a 108MP main camera, a 120Hz AMOLED panel and 33W charging, in a body that is thinner than it has any right to be.",
    highlights: ["6.67-inch AMOLED, 120Hz", "108MP main camera", "33W fast charging", "5,000mAh battery"],
    specs: [
      ["Display", "6.67-inch FHD+ AMOLED, 120Hz"],
      ["Chip", "MediaTek Helio G96 / Snapdragon 685"],
      ["Rear camera", "108MP + 8MP + 2MP"],
      ["Battery", "5,000mAh, 33W"],
    ],
    tags: ["xiaomi", "redmi", "value", "amoled"],
    featured: true,
    variants: [
      {
        label: "128GB · 6GB RAM",
        storage: "128GB",
        ram: "6GB",
        colour: "Midnight Black",
        priceNaira: 265_000,
        stock: 11,
      },
      {
        label: "256GB · 8GB RAM",
        storage: "256GB",
        ram: "8GB",
        colour: "Ice Blue",
        priceNaira: 305_000,
        stock: 6,
      },
    ],
  },
  {
    name: "Oppo A58",
    brand: "oppo",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "A 90Hz screen, 33W charging and a build that feels a class above.",
    description:
      "The A58 gets the fundamentals right — a bright 90Hz display, 33W SUPERVOOC charging and a 5,000mAh battery — in Oppo's unusually solid mid-range body.",
    highlights: [
      "6.72-inch FHD+ display, 90Hz",
      "50MP main camera",
      "33W SUPERVOOC charging",
      "Dual stereo speakers",
    ],
    specs: [
      ["Display", "6.72-inch FHD+, 90Hz"],
      ["Chip", "MediaTek Helio G85"],
      ["Battery", "5,000mAh, 33W"],
    ],
    tags: ["oppo", "mid-range"],
    variants: [
      {
        label: "128GB · 8GB RAM",
        storage: "128GB",
        ram: "8GB",
        colour: "Glowing Black",
        priceNaira: 235_000,
        stock: 3,
      },
    ],
  },
  {
    name: "itel A70",
    brand: "itel",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "The most phone you can buy for just over a hundred thousand naira.",
    description:
      "The A70 is an honest first smartphone: a 6.6-inch 90Hz display, 128GB of storage you can expand, and a 5,000mAh battery, all under ₦130,000.",
    highlights: ["6.6-inch HD+ display, 90Hz", "128GB storage, expandable", "5,000mAh battery", "Dual SIM"],
    specs: [
      ["Display", "6.6-inch HD+, 90Hz"],
      ["Chip", "Unisoc T603"],
      ["Battery", "5,000mAh"],
    ],
    tags: ["itel", "entry", "first phone"],
    variants: [
      {
        label: "128GB · 3GB RAM",
        storage: "128GB",
        ram: "3GB",
        colour: "Starlish Black",
        priceNaira: 118_000,
        stock: 20,
      },
      {
        label: "256GB · 4GB RAM",
        storage: "256GB",
        ram: "4GB",
        colour: "Azure Blue",
        priceNaira: 132_000,
        stock: 14,
      },
    ],
  },
  {
    name: "Nokia G21",
    brand: "nokia",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "Three-day battery life and two years of Android updates.",
    description:
      "Nokia's G21 is built for people who want their phone to last: a 5,050mAh battery that genuinely stretches to three days, clean Android, and two years of OS updates.",
    highlights: [
      "6.5-inch HD+ display, 90Hz",
      "5,050mAh battery, up to 3 days",
      "Two years of Android updates",
    ],
    specs: [
      ["Display", "6.5-inch HD+, 90Hz"],
      ["Chip", "Unisoc T606"],
      ["Battery", "5,050mAh, 18W"],
    ],
    tags: ["nokia", "battery", "durable"],
    variants: [
      {
        label: "128GB · 4GB RAM",
        storage: "128GB",
        ram: "4GB",
        colour: "Nordic Blue",
        priceNaira: 165_000,
        stock: 0,
      },
    ],
  },
  {
    name: "Nokia 105 (2023)",
    brand: "nokia",
    category: "android",
    silhouette: "phone",
    warrantyMonths: 12,
    shortDescription: "The indestructible back-up phone, with weeks of standby.",
    description:
      "A phone that calls, texts and lasts. Weeks of standby on a single charge, an FM radio, a torch and a keypad that works with gloves on. The back-up phone every trader keeps in the drawer.",
    highlights: ["Up to 18 days standby", "FM radio and torch", "Dual SIM", "Drop-resistant body"],
    specs: [
      ["Display", "1.8-inch QQVGA"],
      ["Battery", "1,000mAh removable"],
      ["Network", "2G"],
    ],
    tags: ["nokia", "feature phone", "backup"],
    variants: [{ label: "Charcoal", colour: "Charcoal", priceNaira: 28_500, stock: 25 }],
  },
  {
    name: "Apple iPad (10th generation)",
    brand: "apple",
    category: "tablets",
    silhouette: "tablet",
    warrantyMonths: 12,
    shortDescription: "The all-round iPad — 10.9-inch screen, USB-C and all-day battery.",
    description:
      "The 10th-generation iPad is the one most people should buy: a 10.9-inch Liquid Retina display, the A14 chip, USB-C, and support for the Apple Pencil. Sealed with a one-year warranty.",
    highlights: [
      "10.9-inch Liquid Retina display",
      "A14 Bionic chip",
      "USB-C charging",
      "Touch ID in the top button",
    ],
    specs: [
      ["Display", "10.9-inch Liquid Retina, 2360 × 1640"],
      ["Chip", "A14 Bionic"],
      ["Camera", "12MP wide, 12MP Centre Stage front"],
      ["Battery", "Up to 10 hours"],
    ],
    tags: ["ipad", "apple", "tablet"],
    featured: true,
    variants: [
      { label: "64GB · Wi-Fi · Silver", storage: "64GB", colour: "Silver", priceNaira: 780_000, stock: 4 },
      { label: "256GB · Wi-Fi · Blue", storage: "256GB", colour: "Blue", priceNaira: 980_000, stock: 2 },
    ],
  },
  {
    name: "Samsung Galaxy Tab A9",
    brand: "samsung",
    category: "tablets",
    silhouette: "tablet",
    warrantyMonths: 12,
    shortDescription: "A light, well-priced tablet for lessons, films and the children.",
    description:
      "The Tab A9 is a sensible family tablet: an 8.7-inch screen, dual speakers tuned by AKG, and Samsung Kids built in. Light enough to hold through a film.",
    highlights: [
      "8.7-inch display",
      "Dual speakers with Dolby Atmos",
      "Samsung Kids mode",
      "5,100mAh battery",
    ],
    specs: [
      ["Display", "8.7-inch WXGA+"],
      ["Chip", "MediaTek Helio G99"],
      ["Battery", "5,100mAh"],
    ],
    tags: ["samsung", "tablet", "family"],
    variants: [
      { label: "64GB · Wi-Fi", storage: "64GB", colour: "Graphite", priceNaira: 295_000, stock: 6 },
      { label: "128GB · LTE", storage: "128GB", colour: "Silver", priceNaira: 345_000, stock: 3 },
    ],
  },
  {
    name: "Xiaomi Redmi Pad SE",
    brand: "xiaomi",
    category: "tablets",
    silhouette: "tablet",
    warrantyMonths: 12,
    shortDescription: "An 11-inch 90Hz screen and quad speakers, at a mid-range price.",
    description:
      "The Redmi Pad SE gives you an 11-inch 90Hz display and four speakers for less than most 10-inch tablets. A genuinely good screen for watching and studying.",
    highlights: ["11-inch FHD+ display, 90Hz", "Quad speakers with Dolby Atmos", "8,000mAh battery"],
    specs: [
      ["Display", "11-inch FHD+, 90Hz"],
      ["Chip", "Snapdragon 680"],
      ["Battery", "8,000mAh"],
    ],
    tags: ["xiaomi", "tablet", "value"],
    newArrival: true,
    variants: [
      { label: "128GB · Wi-Fi", storage: "128GB", colour: "Graphite Grey", priceNaira: 295_000, stock: 5 },
    ],
  },
  {
    name: "Apple MacBook Air M1",
    brand: "apple",
    category: "laptops",
    silhouette: "laptop",
    warrantyMonths: 12,
    shortDescription: "Silent, fanless and still quicker than most new Windows laptops.",
    description:
      "The M1 MacBook Air remains the best-value Mac: fanless and silent, 15 hours of real battery life, and more than enough power for everything short of heavy video work.",
    highlights: [
      "13.3-inch Retina display",
      "Apple M1 chip, 8-core",
      "Up to 15 hours battery",
      "Completely silent — no fan",
    ],
    specs: [
      ["Display", "13.3-inch Retina, 2560 × 1600"],
      ["Chip", "Apple M1, 8-core CPU, 7-core GPU"],
      ["Memory", "8GB unified"],
      ["Ports", "2 × Thunderbolt / USB 4, 3.5mm"],
    ],
    tags: ["macbook", "apple", "laptop", "m1"],
    featured: true,
    variants: [
      {
        label: "8GB · 256GB · Space Grey",
        storage: "256GB",
        ram: "8GB",
        colour: "Space Grey",
        priceNaira: 1_150_000,
        compareAtNaira: 1_290_000,
        stock: 3,
      },
    ],
  },
  {
    name: "Apple MacBook Air M2",
    brand: "apple",
    category: "laptops",
    silhouette: "laptop",
    warrantyMonths: 12,
    shortDescription: "The redesigned Air — brighter screen, MagSafe, 1080p camera.",
    description:
      "The M2 Air adds a larger, brighter 13.6-inch display, a 1080p camera, MagSafe charging and four speakers, in a flat body that is thinner than the one it replaced.",
    highlights: [
      "13.6-inch Liquid Retina display",
      "Apple M2 chip",
      "MagSafe 3 charging",
      "1080p FaceTime HD camera",
    ],
    specs: [
      ["Display", "13.6-inch Liquid Retina, 2560 × 1664"],
      ["Chip", "Apple M2, 8-core CPU"],
      ["Battery", "Up to 18 hours"],
      ["Ports", "2 × Thunderbolt, MagSafe 3, 3.5mm"],
    ],
    tags: ["macbook", "apple", "laptop", "m2"],
    newArrival: true,
    variants: [
      {
        label: "8GB · 256GB · Midnight",
        storage: "256GB",
        ram: "8GB",
        colour: "Midnight",
        priceNaira: 1_580_000,
        stock: 2,
      },
      {
        label: "16GB · 512GB · Starlight",
        storage: "512GB",
        ram: "16GB",
        colour: "Starlight",
        priceNaira: 2_050_000,
        stock: 1,
      },
    ],
  },
  {
    name: "Apple Watch SE (2nd generation)",
    brand: "apple",
    category: "smartwatches",
    silhouette: "watch",
    warrantyMonths: 12,
    shortDescription: "Everything an Apple Watch needs to do, without the extras you will not use.",
    description:
      "The Watch SE covers fitness tracking, notifications, crash detection and Apple Pay. The same chip as the Series 8, in a lighter and cheaper body.",
    highlights: [
      "Retina display, always readable",
      "Crash and fall detection",
      "Heart rate and sleep tracking",
      "Water resistant to 50m",
    ],
    specs: [
      ["Case", "40mm or 44mm aluminium"],
      ["Chip", "S8 SiP"],
      ["Battery", "Up to 18 hours"],
      ["Water resistance", "50m"],
    ],
    tags: ["apple watch", "smartwatch", "fitness"],
    featured: true,
    variants: [
      { label: "40mm · Midnight", colour: "Midnight", priceNaira: 395_000, stock: 5 },
      { label: "44mm · Starlight", colour: "Starlight", priceNaira: 440_000, stock: 3 },
    ],
  },
  {
    name: "Apple Watch Series 9",
    brand: "apple",
    category: "smartwatches",
    silhouette: "watch",
    warrantyMonths: 12,
    shortDescription: "A 2000-nit display you can read in Kebbi sunshine, and Double Tap.",
    description:
      "The Series 9 doubles the brightness of the SE's display to 2,000 nits, adds the blood-oxygen and ECG sensors, and introduces Double Tap — pinch twice to answer a call with one hand.",
    highlights: [
      "2,000-nit Always-On Retina display",
      "ECG and blood oxygen sensors",
      "Double Tap gesture",
      "Carbon neutral options",
    ],
    specs: [
      ["Case", "41mm or 45mm aluminium"],
      ["Chip", "S9 SiP"],
      ["Display", "Always-On Retina, 2,000 nits"],
    ],
    tags: ["apple watch", "smartwatch", "ecg"],
    newArrival: true,
    variants: [
      { label: "41mm · Starlight", colour: "Starlight", priceNaira: 690_000, stock: 2 },
      { label: "45mm · Midnight", colour: "Midnight", priceNaira: 750_000, stock: 2 },
    ],
  },
  {
    name: "Samsung Galaxy Watch 6",
    brand: "samsung",
    category: "smartwatches",
    silhouette: "watch",
    warrantyMonths: 12,
    shortDescription: "The Android watch to buy — sleep coaching and body composition.",
    description:
      "The Galaxy Watch 6 pairs properly with any Android phone and does the things a watch should: sleep coaching, body composition, heart rate and a bright AMOLED screen.",
    highlights: [
      "Sapphire crystal AMOLED display",
      "Sleep coaching",
      "Body composition (BIA)",
      "40 hours battery",
    ],
    specs: [
      ["Case", "40mm or 44mm"],
      ["Chip", "Exynos W930"],
      ["Battery", "300mAh, up to 40 hours"],
    ],
    tags: ["samsung", "smartwatch", "android"],
    variants: [{ label: "40mm · Graphite", colour: "Graphite", priceNaira: 385_000, stock: 4 }],
  },
  {
    name: "Oraimo Watch 5",
    brand: "oraimo",
    category: "smartwatches",
    silhouette: "watch",
    warrantyMonths: 12,
    shortDescription: "Bluetooth calling and a week of battery, for under fifty thousand naira.",
    description:
      "The Watch 5 takes calls over Bluetooth, tracks over a hundred sports modes, and runs for a week between charges. The sensible smartwatch for a first-time buyer.",
    highlights: ["1.96-inch AMOLED display", "Bluetooth calling", "7-day battery life", "100+ sport modes"],
    specs: [
      ["Display", "1.96-inch AMOLED"],
      ["Battery", "Up to 7 days"],
      ["Water resistance", "IP68"],
    ],
    tags: ["oraimo", "smartwatch", "budget", "calling"],
    variants: [{ label: "Black", colour: "Black", priceNaira: 48_500, compareAtNaira: 56_000, stock: 16 }],
  },
  {
    name: "Apple AirPods Pro (2nd generation)",
    brand: "apple",
    category: "earbuds",
    silhouette: "earbuds",
    warrantyMonths: 12,
    shortDescription: "The best noise cancellation in an earbud, with Adaptive Audio.",
    description:
      "AirPods Pro 2 cancel roughly twice as much noise as the first generation, switch to Transparency when someone speaks to you, and charge over USB-C. Sealed, one-year warranty.",
    highlights: [
      "Active Noise Cancellation",
      "Adaptive Audio and Transparency",
      "USB-C charging case",
      "Up to 6 hours per charge",
    ],
    specs: [
      ["Chip", "Apple H2"],
      ["Battery", "6 hours, 30 hours with case"],
      ["Case", "USB-C, MagSafe, Find My speaker"],
      ["Water resistance", "IP54"],
    ],
    tags: ["airpods", "apple", "earbuds", "anc"],
    featured: true,
    variants: [{ label: "White", colour: "White", priceNaira: 345_000, stock: 7 }],
  },
  {
    name: "Apple AirPods (3rd generation)",
    brand: "apple",
    category: "earbuds",
    silhouette: "earbuds",
    warrantyMonths: 12,
    shortDescription: "Open-fit AirPods with Spatial Audio and a MagSafe case.",
    description:
      "The third-generation AirPods bring Spatial Audio and Adaptive EQ to the open-fit design, with sweat and water resistance and six hours of listening per charge.",
    highlights: [
      "Spatial Audio with dynamic head tracking",
      "Adaptive EQ",
      "MagSafe charging case",
      "IPX4 sweat resistant",
    ],
    specs: [
      ["Chip", "Apple H1"],
      ["Battery", "6 hours, 30 hours with case"],
      ["Water resistance", "IPX4"],
    ],
    tags: ["airpods", "apple", "earbuds"],
    variants: [{ label: "White", colour: "White", priceNaira: 245_000, stock: 5 }],
  },
  {
    name: "Oraimo FreePods 4",
    brand: "oraimo",
    category: "earbuds",
    silhouette: "earbuds",
    warrantyMonths: 12,
    shortDescription: "Real noise cancellation for the price of a phone case.",
    description:
      "The FreePods 4 give you 25dB of active noise cancellation, four microphones for calls and a case that holds another 20 hours of battery — for under forty thousand naira.",
    highlights: [
      "25dB active noise cancellation",
      "4 microphones for clear calls",
      "Up to 27 hours with case",
      "IPX5 water resistant",
    ],
    specs: [
      ["Driver", "10mm dynamic"],
      ["Battery", "7 hours, 27 hours with case"],
      ["Bluetooth", "5.3"],
    ],
    tags: ["oraimo", "earbuds", "anc", "budget"],
    newArrival: true,
    variants: [{ label: "Black", colour: "Black", priceNaira: 32_500, compareAtNaira: 38_000, stock: 22 }],
  },
  {
    name: "Samsung Galaxy Buds FE",
    brand: "samsung",
    category: "earbuds",
    silhouette: "earbuds",
    warrantyMonths: 12,
    shortDescription: "Samsung's noise-cancelling earbuds, without the flagship price.",
    description:
      "The Buds FE keep the active noise cancellation and the comfortable wingtip fit of Samsung's pricier buds, and pair instantly with any Galaxy phone.",
    highlights: [
      "Active Noise Cancellation",
      "Wingtip fit for a secure seal",
      "Up to 30 hours with case",
      "IPX2",
    ],
    specs: [
      ["Driver", "Single 6.5mm"],
      ["Battery", "6 hours, 30 hours with case"],
      ["Bluetooth", "5.2"],
    ],
    tags: ["samsung", "earbuds", "anc"],
    variants: [{ label: "Graphite", colour: "Graphite", priceNaira: 115_000, stock: 6 }],
  },
  {
    name: "Oraimo BoomPop 2",
    brand: "oraimo",
    category: "headphones",
    silhouette: "headphones",
    warrantyMonths: 12,
    shortDescription: "Over-ear headphones with 70 hours of battery and deep bass.",
    description:
      "BoomPop 2 runs for 70 hours between charges, folds flat for a bag, and tunes its 40mm drivers for the bass-heavy music most customers actually listen to.",
    highlights: [
      "40mm drivers",
      "Up to 70 hours playback",
      "Foldable with carrying pouch",
      "Bluetooth 5.3 with multipoint",
    ],
    specs: [
      ["Driver", "40mm dynamic"],
      ["Battery", "Up to 70 hours"],
      ["Charging", "USB-C"],
    ],
    tags: ["oraimo", "headphones", "over-ear"],
    variants: [{ label: "Black", colour: "Black", priceNaira: 38_500, stock: 9 }],
  },
  {
    name: "JBL Tune 520BT",
    brand: "jbl",
    category: "headphones",
    silhouette: "headphones",
    warrantyMonths: 12,
    shortDescription: "JBL Pure Bass sound and 57 hours of battery, in a headphone you can fold.",
    description:
      "The Tune 520BT delivers JBL's Pure Bass sound with 57 hours of playback, a five-minute charge that gives three hours, and hands-free calling with the built-in microphone.",
    highlights: [
      "JBL Pure Bass sound",
      "57 hours of battery",
      "5-minute charge for 3 hours",
      "Foldable design",
    ],
    specs: [
      ["Driver", "33mm dynamic"],
      ["Battery", "Up to 57 hours"],
      ["Bluetooth", "5.3, multipoint"],
    ],
    tags: ["jbl", "headphones", "bass"],
    variants: [{ label: "Black", colour: "Black", priceNaira: 96_000, stock: 2 }],
  },
  {
    name: "JBL Flip 6",
    brand: "jbl",
    category: "speakers",
    silhouette: "speaker",
    warrantyMonths: 12,
    shortDescription: "The portable speaker everyone recognises — loud, waterproof, 12 hours.",
    description:
      "The Flip 6 is built around a racetrack driver and a separate tweeter, so it stays clear when you turn it up. Waterproof and dustproof to IP67, with twelve hours of playtime.",
    highlights: [
      "Racetrack driver with separate tweeter",
      "IP67 waterproof and dustproof",
      "12 hours of playtime",
      "PartyBoost pairing",
    ],
    specs: [
      ["Output", "20W RMS + 10W tweeter"],
      ["Battery", "12 hours"],
      ["Protection", "IP67"],
    ],
    tags: ["jbl", "speaker", "bluetooth", "waterproof"],
    featured: true,
    variants: [
      { label: "Black", colour: "Black", priceNaira: 185_000, stock: 6 },
      { label: "Blue", colour: "Blue", priceNaira: 185_000, stock: 3 },
    ],
  },
  {
    name: "JBL Go 4",
    brand: "jbl",
    category: "speakers",
    silhouette: "speaker",
    warrantyMonths: 12,
    shortDescription: "Pocket-sized, waterproof, and far louder than it looks.",
    description:
      "The Go 4 fits in a pocket, clips to a bag, survives the rain, and plays for seven hours. The speaker to keep in the car or take to the farm.",
    highlights: ["IP67 waterproof and dustproof", "7 hours of playtime", "Integrated carry loop", "Auracast"],
    specs: [
      ["Output", "4.2W RMS"],
      ["Battery", "7 hours"],
      ["Protection", "IP67"],
    ],
    tags: ["jbl", "speaker", "portable"],
    newArrival: true,
    variants: [{ label: "Blue", colour: "Blue", priceNaira: 68_000, stock: 12 }],
  },
  {
    name: "Oraimo SoundGo",
    brand: "oraimo",
    category: "speakers",
    silhouette: "speaker",
    warrantyMonths: 12,
    shortDescription: "A small, loud Bluetooth speaker that costs less than a tank of fuel.",
    description:
      "SoundGo pairs in seconds, plays for ten hours and takes a splash without complaint. The speaker customers add to the bag at the counter.",
    highlights: [
      "5W driver with passive radiator",
      "10 hours of playtime",
      "IPX5 splash resistant",
      "USB-C charging",
    ],
    specs: [
      ["Output", "5W"],
      ["Battery", "10 hours"],
      ["Protection", "IPX5"],
    ],
    tags: ["oraimo", "speaker", "budget"],
    variants: [{ label: "Black", colour: "Black", priceNaira: 29_500, stock: 18 }],
  },
  {
    name: "Anker 20W USB-C Charger",
    brand: "anker",
    category: "chargers-and-cables",
    silhouette: "charger",
    warrantyMonths: 18,
    shortDescription: "A compact 20W charger that fast-charges an iPhone to half in 30 minutes.",
    description:
      "Anker's 20W PowerPort III is the charger to buy for any modern phone: small enough to disappear in a pocket, with the safety circuitry that cheap chargers leave out.",
    highlights: [
      "20W USB-C Power Delivery",
      "Fast-charges iPhone to 50% in 30 minutes",
      "Anker MultiProtect safety system",
      "18-month warranty",
    ],
    specs: [
      ["Output", "20W USB-C PD"],
      ["Input", "100–240V"],
      ["Warranty", "18 months"],
    ],
    tags: ["anker", "charger", "usb-c", "fast charging"],
    variants: [{ label: "White", colour: "White", priceNaira: 22_500, stock: 30 }],
  },
  {
    name: "Oraimo 30W GaN Charger",
    brand: "oraimo",
    category: "chargers-and-cables",
    silhouette: "charger",
    warrantyMonths: 12,
    shortDescription: "GaN makes it half the size of a normal 30W charger.",
    description:
      "Gallium nitride lets this 30W charger run cooler and smaller than the silicon chargers it replaces. One USB-C port, enough power for a phone or a tablet.",
    highlights: [
      "30W USB-C Power Delivery",
      "GaN — smaller and cooler",
      "Charges phones and tablets",
      "Foldable pins",
    ],
    specs: [
      ["Output", "30W USB-C PD"],
      ["Technology", "GaN"],
    ],
    tags: ["oraimo", "charger", "gan"],
    newArrival: true,
    variants: [{ label: "White", colour: "White", priceNaira: 19_500, stock: 24 }],
  },
  {
    name: "Apple 20W USB-C Power Adapter",
    brand: "apple",
    category: "chargers-and-cables",
    silhouette: "charger",
    warrantyMonths: 12,
    shortDescription: "The genuine Apple adapter — the one that will not damage the battery.",
    description:
      "The original Apple 20W USB-C adapter, as supplied with the iPhone before the box stopped including one. Genuine stock only; we do not sell copies.",
    highlights: ["Genuine Apple product", "20W USB-C Power Delivery", "Works with iPhone, iPad and AirPods"],
    specs: [
      ["Output", "20W USB-C"],
      ["Origin", "Genuine Apple"],
    ],
    tags: ["apple", "charger", "genuine"],
    variants: [{ label: "White", colour: "White", priceNaira: 28_000, stock: 14 }],
  },
  {
    name: "Clear Case for iPhone 13 Pro Max",
    brand: "generic",
    category: "cases-and-protection",
    silhouette: "case",
    warrantyMonths: 0,
    shortDescription: "A slim clear case with raised edges for the screen and cameras.",
    description:
      "A clear TPU case that shows the phone's colour and keeps its corners safe. Raised lips protect the screen and the camera bump when the phone is laid down.",
    highlights: [
      "Slim clear TPU",
      "Raised screen and camera edges",
      "Non-yellowing material",
      "Wireless charging friendly",
    ],
    specs: [
      ["Material", "TPU"],
      ["Fits", "iPhone 13 Pro Max"],
    ],
    tags: ["case", "iphone", "protection"],
    variants: [{ label: "Clear", colour: "Clear", priceNaira: 5_500, stock: 40 }],
  },
  {
    name: "Tempered Glass Screen Protector",
    brand: "generic",
    category: "cases-and-protection",
    silhouette: "case",
    warrantyMonths: 0,
    shortDescription: "9H tempered glass, fitted free in the shop.",
    description:
      "A 2.5D tempered glass protector with an oleophobic coating that keeps fingerprints down. Bring the phone in and we will fit it for you, bubble-free.",
    highlights: [
      "9H hardness tempered glass",
      "Oleophobic anti-fingerprint coating",
      "Case-friendly 2.5D edges",
      "Free fitting in store",
    ],
    specs: [
      ["Hardness", "9H"],
      ["Thickness", "0.33mm"],
    ],
    tags: ["screen protector", "glass", "protection"],
    variants: [
      { label: "Universal 6.1-inch", priceNaira: 3_500, stock: 60 },
      { label: "Universal 6.7-inch", priceNaira: 4_000, stock: 45 },
    ],
  },
  {
    name: "Oraimo 20000mAh Power Bank",
    brand: "oraimo",
    category: "power-banks",
    silhouette: "power-bank",
    warrantyMonths: 12,
    shortDescription: "Four full phone charges, and it fast-charges itself in two hours.",
    description:
      "Twenty thousand milliamp-hours is roughly four full charges for a typical phone. 20W output over USB-C, a digital readout of what is left, and a two-hour recharge.",
    highlights: [
      "20,000mAh capacity",
      "20W USB-C in and out",
      "Digital battery display",
      "Charges three devices at once",
    ],
    specs: [
      ["Capacity", "20,000mAh"],
      ["Output", "20W USB-C PD, 18W USB-A"],
      ["Recharge time", "About 2 hours"],
    ],
    tags: ["oraimo", "power bank", "20000mah"],
    featured: true,
    variants: [{ label: "Black", colour: "Black", priceNaira: 42_500, compareAtNaira: 49_000, stock: 13 }],
  },
  {
    name: "Anker PowerCore 10000",
    brand: "anker",
    category: "power-banks",
    silhouette: "power-bank",
    warrantyMonths: 18,
    shortDescription: "Smaller than a phone, with two and a half charges inside it.",
    description:
      "The PowerCore 10000 is the power bank that actually stays in the bag, because it is no bigger than a phone. Anker's safety circuitry and an 18-month warranty.",
    highlights: [
      "10,000mAh in a pocket-sized body",
      "PowerIQ fast charging",
      "MultiProtect safety system",
      "18-month warranty",
    ],
    specs: [
      ["Capacity", "10,000mAh"],
      ["Output", "12W USB-A"],
      ["Warranty", "18 months"],
    ],
    tags: ["anker", "power bank", "compact"],
    variants: [{ label: "Black", colour: "Black", priceNaira: 38_000, stock: 8 }],
  },
  {
    name: "128GB microSD Memory Card",
    brand: "generic",
    category: "memory",
    silhouette: "memory",
    warrantyMonths: 12,
    shortDescription: "Class 10 storage for photos, music and offline films.",
    description:
      "A 128GB Class 10 microSD card with an SD adapter in the box. Fast enough for 1080p video recording, and tested in the shop before you take it.",
    highlights: ["128GB capacity", "Class 10 / U1 speed", "SD adapter included", "Tested before sale"],
    specs: [
      ["Capacity", "128GB"],
      ["Speed class", "Class 10, U1"],
      ["Read speed", "Up to 100MB/s"],
    ],
    tags: ["memory card", "microsd", "storage"],
    variants: [{ label: "128GB", storage: "128GB", priceNaira: 18_500, stock: 26 }],
  },
];
