# Trust Graph - Fraud Detection System

A comprehensive fraud detection and management system with real-time risk analysis, graph-based detection, and ML-powered predictions.

## Architecture

```
Next.js (Frontend)
      ↓
Node.js API (Express + TypeScript)
      ↓
┌─────┴─────┐
│           │
PostgreSQL  Neo4j
│           │
├─────┬─────┤
│     │     │
XGBoost  GraphML  SHAP
```

## Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Next.js + Tailwind | Investigator dashboard |
| API | Node.js + Express | REST API |
| Database | PostgreSQL | Application data |
| Graph DB | Neo4j | Relationship analysis |
| Transaction ML | XGBoost | Transaction fraud prediction |
| Graph ML | GradientBoosting | Graph-based fraud detection |
| Explanations | SHAP | Model interpretability |
| Guardrails | TypeScript | 95% precision enforcement |

## Quick Start

```bash
# 1. Start databases
docker compose up -d

# 2. Seed PostgreSQL
cd server && bun run db:seed

# 3. Seed Neo4j
bun run graph:seed

# 4. Train ML models
cd ml/transaction && .venv/bin/python train.py
cd ml/graph && .venv/bin/python train.py

# 5. Start ML services
cd ml/transaction && .venv/bin/uvicorn app:app --port 8000
cd ml/graph && .venv/bin/uvicorn app:app --port 8001

# 6. Start API
cd server && bun run dev

# 7. Start Frontend
cd web && npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/risk/analyze` | POST | Analyze transaction |
| `/api/cases` | GET | List fraud cases |
| `/api/cases/:id` | GET | Get case details |
| `/api/sellers` | GET | List sellers |
| `/api/transactions` | GET | List transactions |
| `/api/appeals` | GET | List appeals |
| `/api/graph/stats` | GET | Graph statistics |
| `/api/graph/neighbors` | GET | Find graph neighbors |
| `/api/fairness/report` | GET | Fairness metrics |

## Risk Signals

- Transaction amount
- Refund rate
- Account age
- IP reputation
- Device linkage
- Order velocity
- Dispute rate
- Graph relationships
- ML predictions

## Fairness & Guardrails

- 95% precision threshold for automated actions
- Human review required for critical cases
- Fairness metrics across seller groups
- SHAP explanations for all predictions
