import path from "node:path";
import type { NextConfig } from "next";

/**
 * The browser only ever talks to this origin: `/api` and `/uploads` are rewritten to the Express API, so
 * cookies stay first-party and no CORS preflight stands between a page and its data (overview §6.3).
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * `page.dev.tsx` files are routes in development only. A production build does not list `dev.tsx` as a page
   * extension, so `/style-guide` is not compiled, not routed and not shipped (Batch 1 Part C).
   */
  pageExtensions: process.env.NODE_ENV === "production" ? ["ts", "tsx"] : ["dev.tsx", "ts", "tsx"],

  // `@aib/shared` ships TypeScript-built ESM from the workspace; Next compiles it with the app.
  transpilePackages: ["@aib/shared"],

  // This monorepo, not whatever lockfile happens to sit above it on the developer's machine.
  outputFileTracingRoot: path.join(import.meta.dirname, ".."),

  // One flat config lints the whole workspace from the repo root (`pnpm lint`), including the Next rules, so
  // the build does not run a second, narrower pass over the same files.
  eslint: { ignoreDuringBuilds: true },

  images: {
    // Product images come through the rewrite above, so they are same-origin in the browser. Remote patterns
    // are listed for the deployed case, where the API sits on its own host and uploads live on the CDN.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
      // Cloudinary in production (Batch 3 Part H.1). The cloud name is part of the path, not the host.
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      ...(process.env.API_ORIGIN
        ? [
            {
              protocol: new URL(process.env.API_ORIGIN).protocol.replace(":", "") as "http" | "https",
              hostname: new URL(process.env.API_ORIGIN).hostname,
              pathname: "/uploads/**",
            },
          ]
        : []),
    ],
  },

  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
