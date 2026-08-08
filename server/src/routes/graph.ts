import { Router } from "express";
import {
  getGraphNeighbors,
  getGraphStats,
  getSellerGraphRisk,
  getGraphVerdicts,
} from "../controllers/graphController";

const router = Router();

router.get("/neighbors", getGraphNeighbors);
router.get("/stats", getGraphStats);
router.get("/verdicts", getGraphVerdicts);
router.get("/seller/:sellerId/risk", getSellerGraphRisk);

export default router;
