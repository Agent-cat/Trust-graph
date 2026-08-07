import { Router } from "express";
import { listTransactions } from "../controllers/transactionsController";

const router = Router();

router.get("/", listTransactions);

export default router;
