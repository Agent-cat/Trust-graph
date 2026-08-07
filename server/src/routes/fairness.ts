import { Router } from "express";
import { getFairnessReport } from "../controllers/fairnessController";

const router = Router();

router.get("/report", getFairnessReport);

export default router;
