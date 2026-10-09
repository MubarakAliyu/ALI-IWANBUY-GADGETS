import { Router } from "express";
import { catalogRouter } from "./catalog.routes.js";

/** `/api/v1` — the public catalogue today; customer and admin routers join it in Batches 2 and 3. */
export const apiRouter: Router = Router();

apiRouter.use(catalogRouter);
