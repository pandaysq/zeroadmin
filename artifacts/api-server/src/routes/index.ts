import { Router, type IRouter } from "express";
import healthRouter from "./health";
import serversRouter from "./servers";
import alertsRouter from "./alerts";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(serversRouter);
router.use(alertsRouter);
router.use(dashboardRouter);

export default router;
