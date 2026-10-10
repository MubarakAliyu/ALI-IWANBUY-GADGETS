import {
  adminCancelOrderSchema,
  adminChangePasswordSchema,
  adminLoginSchema,
  adminOrderQuerySchema,
  adminProductQuerySchema,
  adminProfileSchema,
  advanceOrderSchema,
  brandInputSchema,
  bulkProductStatusSchema,
  categoryInputSchema,
  confirmPaymentSchema,
  dashboardQuerySchema,
  invoiceQuerySchema,
  orderNoteSchema,
  paymentQuerySchema,
  productInputSchema,
  refundOrderSchema,
  reorderSchema,
  setPinSchema,
  stockAdjustSchema,
  voidInvoiceSchema,
} from "@aib/shared";
import { Router } from "express";
import * as authController from "../controllers/admin-auth.controller.js";
import * as catalogueController from "../controllers/admin-catalogue.controller.js";
import * as orderController from "../controllers/admin-order.controller.js";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { requirePermission } from "../lib/permissions.js";
import { accountRateLimit, authRateLimit } from "../middleware/rate-limit.js";
import { requireAdmin, requirePasswordChosen } from "../middleware/require-admin.js";
import { uploadImage } from "../middleware/upload.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

/**
 * `/api/v1/admin` — the dashboard (overview §11).
 *
 * Only the sign-in routes are open. Everything after `requireAdmin` re-reads the account on every request,
 * slides the session, and — except for the two routes that let an admin finish setting themselves up —
 * refuses anyone still carrying a temporary password.
 */
export const adminRouter: Router = Router();

adminRouter.post("/auth/login", authRateLimit, validateBody(adminLoginSchema), authController.login);
adminRouter.post("/auth/logout", authController.logout);
adminRouter.get("/auth/me", authController.me);

adminRouter.use(accountRateLimit, requireAdmin);

// Allowed while `mustChangePassword` is still set — this is how an admin clears it.
adminRouter.post(
  "/auth/change-password",
  validateBody(adminChangePasswordSchema),
  authController.changePassword,
);
adminRouter.post("/me/pin", validateBody(setPinSchema), authController.setOwnPin);

adminRouter.use(requirePasswordChosen);

adminRouter.patch("/me/profile", validateBody(adminProfileSchema), authController.updateProfile);

// ── Overview (A-3) ──────────────────────────────────────────────────────────────────────────────────
//
// Every role may open the dashboard; what it contains depends on the role, decided inside the controller.

adminRouter.get(
  "/dashboard",
  requirePermission("dashboard.operational"),
  validateQuery(dashboardQuerySchema),
  dashboardController.dashboard,
);

// ── Orders (A-4) ────────────────────────────────────────────────────────────────────────────────────
//
// Fulfilling an order is staff work; cancelling one and anything to do with money is not. The permission on
// each route is the only thing that decides — the dashboard hides what it cannot do, but that is courtesy.

adminRouter.get(
  "/orders",
  requirePermission("orders.view"),
  validateQuery(adminOrderQuerySchema),
  orderController.list,
);
adminRouter.get(
  "/orders/export",
  requirePermission("orders.view"),
  validateQuery(adminOrderQuerySchema),
  orderController.exportOrders,
);
adminRouter.get("/orders/:number", requirePermission("orders.view"), orderController.detail);
adminRouter.post(
  "/orders/:number/status",
  requirePermission("orders.fulfil"),
  validateBody(advanceOrderSchema),
  orderController.advance,
);
adminRouter.post(
  "/orders/:number/notes",
  requirePermission("orders.view"),
  validateBody(orderNoteSchema),
  orderController.note,
);
adminRouter.post(
  "/orders/:number/cancel",
  requirePermission("orders.cancel"),
  validateBody(adminCancelOrderSchema),
  orderController.cancel,
);
adminRouter.post(
  "/orders/:number/refund",
  requirePermission("orders.refund"),
  validateBody(refundOrderSchema),
  orderController.refund,
);
adminRouter.post(
  "/orders/:number/confirm-payment",
  requirePermission("payments.confirm"),
  validateBody(confirmPaymentSchema),
  orderController.confirm,
);

// ── Catalogue (A-5, A-6) ────────────────────────────────────────────────────────────────────────────
//
// Staff may look at products and change stock — that is counting a shelf. Changing a price, a description or
// what is on sale is management work.

adminRouter.get(
  "/products",
  requirePermission("products.view"),
  validateQuery(adminProductQuerySchema),
  catalogueController.list,
);
adminRouter.post(
  "/products",
  requirePermission("products.manage"),
  validateBody(productInputSchema),
  catalogueController.create,
);
adminRouter.post(
  "/products/bulk-status",
  requirePermission("products.manage"),
  validateBody(bulkProductStatusSchema),
  catalogueController.bulkStatus,
);
adminRouter.post(
  "/uploads/:folder",
  requirePermission("products.manage"),
  uploadImage,
  catalogueController.uploadImage,
);
adminRouter.get("/products/:id", requirePermission("products.view"), catalogueController.detail);
adminRouter.patch(
  "/products/:id",
  requirePermission("products.manage"),
  validateBody(productInputSchema),
  catalogueController.update,
);
adminRouter.post(
  "/products/:id/stock",
  requirePermission("products.stock"),
  validateBody(stockAdjustSchema),
  catalogueController.adjustStock,
);

adminRouter.get("/categories", requirePermission("products.view"), catalogueController.categories);
adminRouter.post(
  "/categories",
  requirePermission("catalogue.manage"),
  validateBody(categoryInputSchema),
  catalogueController.createCategory,
);
adminRouter.post(
  "/categories/reorder",
  requirePermission("catalogue.manage"),
  validateBody(reorderSchema),
  catalogueController.reorderCategories,
);
adminRouter.patch(
  "/categories/:id",
  requirePermission("catalogue.manage"),
  validateBody(categoryInputSchema),
  catalogueController.updateCategory,
);
adminRouter.delete(
  "/categories/:id",
  requirePermission("catalogue.manage"),
  catalogueController.deleteCategory,
);

adminRouter.get("/brands", requirePermission("products.view"), catalogueController.brands);
adminRouter.post(
  "/brands",
  requirePermission("catalogue.manage"),
  validateBody(brandInputSchema),
  catalogueController.createBrand,
);
adminRouter.patch(
  "/brands/:id",
  requirePermission("catalogue.manage"),
  validateBody(brandInputSchema),
  catalogueController.updateBrand,
);
adminRouter.delete("/brands/:id", requirePermission("catalogue.manage"), catalogueController.deleteBrand);

// ── Payments (A-7) ──────────────────────────────────────────────────────────────────────────────────

adminRouter.get("/payments/awaiting", requirePermission("payments.view"), orderController.awaiting);
adminRouter.get(
  "/payments/export",
  requirePermission("payments.view"),
  validateQuery(paymentQuerySchema),
  orderController.exportPayments,
);
adminRouter.get(
  "/payments",
  requirePermission("payments.view"),
  validateQuery(paymentQuerySchema),
  orderController.payments,
);

// ── Invoices (A-8) ──────────────────────────────────────────────────────────────────────────────────

adminRouter.get(
  "/invoices/export",
  requirePermission("invoices.manage"),
  validateQuery(invoiceQuerySchema),
  orderController.exportInvoices,
);
adminRouter.get(
  "/invoices",
  requirePermission("invoices.manage"),
  validateQuery(invoiceQuerySchema),
  orderController.invoices,
);
adminRouter.get(
  "/invoices/:invoiceNumber.pdf",
  requirePermission("invoices.manage"),
  orderController.downloadInvoice,
);
adminRouter.post(
  "/invoices/:invoiceNumber/send",
  requirePermission("invoices.manage"),
  orderController.emailInvoice,
);
adminRouter.post(
  "/invoices/:invoiceNumber/void",
  requirePermission("invoices.void"),
  validateBody(voidInvoiceSchema),
  orderController.voidOne,
);
