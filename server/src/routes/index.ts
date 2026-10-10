import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { catalogRouter } from "./catalog.routes.js";
import { customerRouter } from "./customer.routes.js";

/** `/api/v1` — the public catalogue, the customer area and the dashboard. */
export const apiRouter: Router = Router();

apiRouter.use(catalogRouter);
apiRouter.use(customerRouter);
apiRouter.use("/admin", adminRouter);
