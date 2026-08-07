import { Router } from "express";
import { analyzeTransaction } from "../controllers/analyzeController";

const router = Router();

router.post("/analyze", analyzeTransaction);

export default router;
