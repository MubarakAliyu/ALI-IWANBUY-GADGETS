import { cartValidateRequestSchema } from "@aib/shared";
import { Router } from "express";
import * as controller from "../controllers/catalog.controller.js";
import { validateBody } from "../middleware/validate.js";

/** Everything a guest can reach (overview §11, public section). No authentication, no cookies needed. */
export const catalogRouter: Router = Router();

catalogRouter.get("/catalog/home", controller.home);
catalogRouter.get("/products", controller.listProducts);
catalogRouter.get("/products/:slug", controller.productBySlug);
catalogRouter.get("/products/:slug/related", controller.relatedProducts);
catalogRouter.get("/categories", controller.categories);
catalogRouter.get("/brands", controller.brands);
catalogRouter.get("/search/suggest", controller.searchSuggest);
catalogRouter.get("/settings/public", controller.publicSettings);
catalogRouter.post("/cart/validate", validateBody(cartValidateRequestSchema), controller.cartValidate);
