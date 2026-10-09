/**
 * Everything a customer sends about themselves (overview §6.4, §9 S-8, S-12). The client validates with these
 * schemas in the browser and the server validates with the same ones at the edge, so a message a customer sees
 * in a form is the message the API would have given.
 */

import { z } from "zod";
import { objectIdSchema } from "./catalog.js";

/** The 36 states and the Federal Capital Territory, as a delivery address names them. */
export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT — Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;
export type NigerianState = (typeof NIGERIAN_STATES)[number];

export const MAX_ADDRESSES = 5;

/** Passwords: at least 8 characters, with a letter and a digit (overview §6.4). */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(100, "That is too long")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(160)
  .pipe(z.email("Enter a valid email address"));

/**
 * A Nigerian phone number in any of the shapes people type it — `08039254143`, `+234 803 925 4143`,
 * `234-803-925-4143` — normalised to `+2348039254143`.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => /^(?:\+?234|0)[789][01]\d{8}$/.test(value), "Enter a Nigerian phone number")
  .transform((value) => `+234${value.replace(/^(?:\+?234|0)/, "")}`);

export const nameSchema = z.string().trim().min(2, "Enter at least 2 characters").max(60);

export const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: "Please accept the terms to continue" }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "The passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: z.union([phoneSchema, z.literal("")]).optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "The passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: nameSchema,
  phone: phoneSchema,
  line1: z.string().trim().min(5, "Enter the street address").max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter the city or town").max(60),
  state: z.enum(NIGERIAN_STATES, { message: "Choose a state" }),
  landmark: z.string().trim().max(120).optional(),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const addressDtoSchema = addressSchema.extend({
  id: objectIdSchema,
  label: z.string(),
  line2: z.string(),
  landmark: z.string(),
  isDefault: z.boolean(),
});
export type Address = z.infer<typeof addressDtoSchema>;

export const customerSchema = z.object({
  id: objectIdSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  addresses: z.array(addressDtoSchema),
  /** The products on the wishlist, so every heart on the page knows its state without another request. */
  wishlistProductIds: z.array(objectIdSchema),
  wishlistCount: z.number().int().min(0),
  createdAt: z.string(),
});
export type Customer = z.infer<typeof customerSchema>;

/** `GET /auth/me` answers for a signed-out visitor too, so the header can render either way. */
export const sessionSchema = z.object({ customer: customerSchema.nullable() });
export type Session = z.infer<typeof sessionSchema>;
