import { Router } from "express";
import { catalogRouter } from "./catalog.routes.js";
import { customerRouter } from "./customer.routes.js";

/** `/api/v1` — the public catalogue and the customer area. The admin router joins them in Batch 3. */
export const apiRouter: Router = Router();

apiRouter.use(catalogRouter);
apiRouter.use(customerRouter);
