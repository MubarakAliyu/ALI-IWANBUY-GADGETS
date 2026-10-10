/**
 * Environment — parsed once, at boot, with zod (Batch 1 Part A). A missing or malformed variable stops the
 * process with a message naming the variable, rather than surfacing as a confusing failure hours later.
 *
 * Secrets that only later batches use are optional in development and required in production, so a fresh clone
 * can run the storefront with nothing but a database URI.
 */

import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),

    /** Must be a replica set — transactions need one (ADR-005). `pnpm db:local` prints a suitable URI. */
    MONGODB_URI: z.string().min(1),
    MONGODB_DB_NAME: z.string().min(1).default("aib_store"),

    /**
     * How the auth cookies are scoped. `lax` is right whenever the browser reaches the API through the
     * Next.js rewrite, which is the deployment this project ships; `none` is the fallback for an API on its
     * own domain, and forces `secure` (Batch 3 Part H.1).
     */
    COOKIE_SAMESITE: z.enum(["lax", "none"]).default("lax"),

    /** The single browser origin allowed to call the API with credentials. */
    CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),

    /**
     * Signing keys for the two session realms. The customer realm is in use from Batch 2, so its key is
     * required everywhere; `.env.example` ships a development value to replace in production. The admin key
     * joins it in Batch 3.
     */
    CUSTOMER_JWT_SECRET: z.string().min(24, "must be at least 24 characters"),
    ADMIN_JWT_SECRET: z.string().min(24).optional(),

    /**
     * Where uploaded and generated product images live. `local` writes under `server/uploads` and is the
     * development default; `cloudinary` is for production, where the host's disk does not survive a deploy.
     */
    STORAGE_PROVIDER: z.enum(["local", "cloudinary"]).default("local"),
    UPLOAD_DIR: z.string().min(1).default("uploads"),
    /** `cloudinary://<api_key>:<api_secret>@<cloud_name>`, from the Cloudinary dashboard. */
    CLOUDINARY_URL: z.string().min(1).optional(),

    /**
     * Allows `pnpm seed` to run against a production database. Never set by a deploy — the lab's demo site
     * needs it once, by hand, and a real shop never needs it at all (Batch 3 Part H.1).
     */
    ALLOW_DEMO_SEED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    /** Outgoing email (Batch 2 onwards). Without SMTP settings the mailer writes to `server/.local/outbox`. */
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(1).default("ALI_IWANBUY Gadgets <no-reply@aliiwanbuy.com>"),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") {
      return;
    }
    for (const key of ["ADMIN_JWT_SECRET"] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "is required in production (at least 24 characters)",
        });
      }
    }

    // Choosing Cloudinary without its URL would fail on the first upload rather than at boot.
    if (env.STORAGE_PROVIDER === "cloudinary" && !env.CLOUDINARY_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["CLOUDINARY_URL"],
        message: "is required when STORAGE_PROVIDER=cloudinary",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function readEnv(): Env {
  // `.env` files spell "not set" as `KEY=`, so an empty value means absent rather than an empty string.
  const source = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ""),
  );
  const parsed = envSchema.safeParse(source);
  if (parsed.success) {
    return parsed.data;
  }
  const lines = parsed.error.issues.map(
    (issue) => `  • ${issue.path.join(".") || "(root)"} — ${issue.message}`,
  );
  throw new Error(
    `Environment is not valid:\n${lines.join("\n")}\n\nCopy server/.env.example to server/.env and fill it in.`,
  );
}

export const env: Env = readEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
