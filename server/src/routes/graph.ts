import { Router } from "express";
import {
  getGraphNeighbors,
  getGraphStats,
  getSellerGraphRisk,
} from "../controllers/graphController";

const router = Router();

router.get("/neighbors", getGraphNeighbors);
router.get("/stats", getGraphStats);
router.get("/seller/:sellerId/risk", getSellerGraphRisk);

export default router;
