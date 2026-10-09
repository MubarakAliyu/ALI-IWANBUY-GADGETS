import {
  addressSchema,
  cancelOrderSchema,
  changePasswordSchema,
  loginSchema,
  placeOrderSchema,
  profileSchema,
  registerSchema,
  saveCartSchema,
  transferMadeSchema,
} from "@aib/shared";
import { Router } from "express";
import * as accountController from "../controllers/account.controller.js";
import * as authController from "../controllers/auth.controller.js";
import * as orderController from "../controllers/order.controller.js";
import { accountRateLimit, authRateLimit } from "../middleware/rate-limit.js";
import { requireCustomer } from "../middleware/require-customer.js";
import { validateBody } from "../middleware/validate.js";

/**
 * Everything a customer can reach (overview §11). The session routes are rate limited; the rest sit behind
 * `requireCustomer`, which re-reads the account and its token version on every request.
 */
export const customerRouter: Router = Router();

// ── Sessions ────────────────────────────────────────────────────────────────────────────────────────
customerRouter.post(
  "/auth/register",
  authRateLimit,
  validateBody(registerSchema),
  authController.registerCustomer,
);
customerRouter.post("/auth/login", authRateLimit, validateBody(loginSchema), authController.loginCustomer);
customerRouter.post("/auth/logout", authController.logoutCustomer);
customerRouter.get("/auth/me", authController.me);

// ── The account itself ──────────────────────────────────────────────────────────────────────────────
customerRouter.use("/me", accountRateLimit, requireCustomer);
customerRouter.patch("/me/profile", validateBody(profileSchema), accountController.updateProfile);
customerRouter.post("/me/password", validateBody(changePasswordSchema), accountController.changePassword);

customerRouter.get("/me/addresses", accountController.listAddresses);
customerRouter.post("/me/addresses", validateBody(addressSchema), accountController.addAddress);
customerRouter.patch("/me/addresses/:id", validateBody(addressSchema), accountController.updateAddress);
customerRouter.delete("/me/addresses/:id", accountController.deleteAddress);
customerRouter.post("/me/addresses/:id/default", accountController.setDefaultAddress);

customerRouter.get("/me/wishlist", accountController.getWishlist);
customerRouter.post("/me/wishlist/:productId", accountController.addToWishlist);
customerRouter.delete("/me/wishlist/:productId", accountController.removeFromWishlist);

customerRouter.get("/me/cart", accountController.getCart);
customerRouter.put("/me/cart", validateBody(saveCartSchema), accountController.saveCart);
customerRouter.post("/me/cart/merge", validateBody(saveCartSchema), accountController.mergeCart);

// ── Orders ──────────────────────────────────────────────────────────────────────────────────────────
customerRouter.get("/checkout/settings", orderController.checkoutSettings);
customerRouter.use("/orders", accountRateLimit, requireCustomer);
customerRouter.post("/orders", validateBody(placeOrderSchema), orderController.placeOrder);
customerRouter.get("/orders", orderController.listOrders);
customerRouter.get("/orders/:number", orderController.getOrder);
customerRouter.post(
  "/orders/:number/transfer-made",
  validateBody(transferMadeSchema),
  orderController.transferMade,
);
customerRouter.post("/orders/:number/cancel", validateBody(cancelOrderSchema), orderController.cancelOrder);
customerRouter.get("/orders/:number/invoice.pdf", orderController.downloadInvoice);
