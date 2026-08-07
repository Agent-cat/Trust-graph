import { Router } from "express";
import { listAuditLogs } from "../controllers/auditLogController";

const router = Router();

router.get("/", listAuditLogs);

export default router;
