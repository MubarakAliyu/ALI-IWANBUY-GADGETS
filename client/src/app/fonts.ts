import localFont from "next/font/local";

/**
 * Montserrat, and nothing else (overview §4.2). The WOFF2 subsets are served from this repository, so no
 * request ever leaves for Google Fonts and the type is identical to the inventory system's.
 */
export const montserrat = localFont({
  src: [
    { path: "./fonts/montserrat-300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/montserrat-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/montserrat-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/montserrat-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/montserrat-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
});
