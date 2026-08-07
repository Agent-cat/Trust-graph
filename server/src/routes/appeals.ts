import { Router } from "express";
import {
  createAppeal,
  listAppeals,
  reviewAppeal,
} from "../controllers/appealsController";

const router = Router();

router.post("/", createAppeal);
router.get("/", listAppeals);
router.patch("/:id/review", reviewAppeal);

export default router;
