import { Router } from "express";
import { listSellers, getSeller } from "../controllers/sellersController";

const router = Router();

router.get("/", listSellers);
router.get("/:id", getSeller);

export default router;
