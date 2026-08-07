import express from "express";
import cors from "cors";
import "dotenv/config";
import riskRoutes from "./routes/risk";
import casesRoutes from "./routes/cases";
import sellersRoutes from "./routes/sellers";
import transactionsRoutes from "./routes/transactions";
import appealsRoutes from "./routes/appeals";
import auditLogRoutes from "./routes/auditLogs";
import graphRoutes from "./routes/graph";
import fairnessRoutes from "./routes/fairness";

const app = express();

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "trust-graph-api",
    status: "healthy",
  });
});

app.use("/api/risk", riskRoutes);
app.use("/api/cases", casesRoutes);
app.use("/api/sellers", sellersRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/appeals", appealsRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/fairness", fairnessRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Trust Graph API running on http://localhost:${PORT}`);
});
