import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
import authRouter from "./auth";
import healthRouter from "./health";
import membersRouter from "./members";
import eventsRouter from "./events";
import attendeesRouter from "./attendees";
import exportRouter from "./export";
import statsRouter from "./stats";
import settingsRouter from "./settings";

const router: IRouter = Router();

// Auth routes are always public
router.use(authRouter);

// Everything else requires auth when credentials are configured
router.use(requireAuth);

router.use(healthRouter);
router.use(membersRouter);
router.use(eventsRouter);
router.use(attendeesRouter);
router.use(exportRouter);
router.use(statsRouter);
router.use(settingsRouter);

export default router;
