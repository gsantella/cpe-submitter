import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import eventsRouter from "./events";
import attendeesRouter from "./attendees";
import exportRouter from "./export";
import statsRouter from "./stats";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(eventsRouter);
router.use(attendeesRouter);
router.use(exportRouter);
router.use(statsRouter);
router.use(settingsRouter);

export default router;
