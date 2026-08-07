import { Router } from "express";
import { listCases, getCase, updateCaseStatus } from "../controllers/casesController";

const router = Router();

router.get("/", listCases);
router.get("/:id", getCase);
router.patch("/:id/status", updateCaseStatus);

export default router;
