import { Router } from "express";
import {
  listSellers,
  getSeller,
  updateSellerFlag,
} from "../controllers/sellersController";

const router = Router();

router.get("/", listSellers);
router.get("/:id", getSeller);
router.patch("/:id", updateSellerFlag);

export default router;
