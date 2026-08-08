# Trust Graph — Seller Fraud Detection System

A full-stack, production-grade fraud detection platform built for e-commerce marketplaces. It combines rule-based risk scoring, two independent ML models, graph relationship analysis, and an investigator dashboard into one cohesive system.

---

## What We Built

Seller fraud on marketplaces is hard to catch with simple rules alone. A fraudulent seller can have a legitimate-looking account, a clean transaction history on its own, but be deeply connected to known fraud actors through shared devices, IP addresses, or order patterns.

Trust Graph tackles this by fusing **three independent fraud signals** — a rule-based risk engine, a transaction-level XGBoost classifier, and a graph-based GradientBoosting model trained on Neo4j relationship features — and combining them into a single weighted risk score. Every decision is explainable via SHAP values and an AI-generated narrative, and every automated action is guarded by a 95% precision enforcement layer.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js  Frontend                         │
│          Investigator Dashboard · Auth · Graph UI            │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────────────┐
│              Node.js  API  (Express + TypeScript)            │
│   Risk Engine · Controllers · Fairness · Guardrail Layer     │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌───▼──────────────────────┐
│ PostgreSQL  │ │   Neo4j    │ │   Python ML Services      │
│ App Data    │ │ Graph DB   │ │  (FastAPI · uvicorn)      │
│ Prisma ORM  │ │ GDS Plugin │ ├──────────┬────────────────┤
└─────────────┘ └─────┬──────┘ │ XGBoost  │ GradientBoost │
                      │        │ :8000    │ :8001         │
                      │        │ + SHAP   │ (graph feats) │
                 Graph Queries  └──────────┴────────────────┘
                 PageRank
                 Device/IP clustering
```

---

## Project Structure

```
projects/
├── docker-compose.yml          # PostgreSQL + Neo4j containers
│
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── index.ts            # Express app entry point
│   │   ├── routes/             # API route definitions
│   │   ├── controllers/        # Request handlers
│   │   ├── risk/
│   │   │   ├── calculateRisk.ts   # Weighted risk scoring engine
│   │   │   ├── guardrail.ts       # 95% precision enforcement
│   │   │   └── fairness.ts        # Disparate impact / fairness metrics
│   │   ├── services/
│   │   │   ├── mlService.ts       # Calls to Python ML APIs
│   │   │   ├── llmExplanation.ts  # AI-generated narrative summaries
│   │   │   ├── abuseIpDb.ts       # IP reputation lookup
│   │   │   └── gstinVerification.ts # GST ID validation
│   │   └── utils/
│   │       └── neo4j.ts           # Neo4j driver + query helpers
│   └── prisma/
│       ├── schema.prisma       # Data models
│       ├── seed.ts             # PostgreSQL seed data
│       └── seed-graph.ts       # Neo4j graph seed data
│
├── ml/
│   ├── transaction/            # XGBoost fraud classifier
│   │   ├── train.py            # Model training
│   │   ├── app.py              # FastAPI prediction + SHAP explain endpoints
│   │   └── models/fraud_xgboost.pkl
│   │
│   └── graph/                  # Graph-feature fraud classifier
│       ├── train.py            # GradientBoosting training
│       ├── app.py              # FastAPI prediction endpoint
│       └── models/graph_fraud.pkl
│
└── web/                        # Next.js frontend
    └── app/
        ├── dashboard/
        │   ├── cases/          # Fraud case management
        │   ├── sellers/        # Seller profiles + risk view
        │   ├── transactions/   # Transaction ledger
        │   ├── appeals/        # Seller appeal workflow
        │   ├── graph/          # Interactive Neo4j graph visualizer
        │   ├── audit/          # Audit log trail
        │   └── demo/           # Live system demo page
        ├── sign-in/
        └── sign-up/
```

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 | App Router, SSR, fast iteration |
| **Styling** | Tailwind CSS v4 | Utility-first, consistent design |
| **Graph UI** | React Flow (`@xyflow/react`) | Interactive node/edge visualization |
| **Auth** | Better Auth | Session management, role-based access |
| **Backend** | Node.js + Express 5 + TypeScript | Type-safe API layer |
| **Runtime** | Bun | Fast TypeScript execution, built-in watch |
| **ORM** | Prisma v7 | Type-safe DB client, migrations |
| **Relational DB** | PostgreSQL 17 | Primary application data store |
| **Graph DB** | Neo4j 5 + GDS Plugin | Relationship-based fraud detection |
| **ML (transactions)** | XGBoost + scikit-learn | High-precision fraud classification |
| **ML (graph)** | GradientBoosting | Graph topology fraud signals |
| **Explainability** | SHAP (TreeExplainer) | Per-feature impact on predictions |
| **ML API** | FastAPI + uvicorn | Async Python prediction services |
| **Validation** | Zod | Runtime type validation on API inputs |
| **Containers** | Docker Compose | Database environment management |
| **IP Reputation** | AbuseIPDB API | External IP threat intelligence |
| **Identity** | GSTIN Verification | Indian GST ID format & risk check |

---

## Core Features

### 1. Multi-Signal Risk Engine

Every transaction is scored by combining nine independent signals, each contributing a weighted component to a final 0–100 risk score:

| Signal | Weight | What it measures |
|---|---|---|
| ML fraud probability (XGBoost) | 20% | Transaction-level classification |
| Graph risk (Neo4j) | 20% | Relationship-based risk from the fraud network |
| Transaction amount | 12% | Unusually large payouts |
| Refund rate | 12% | Abnormal return/refund patterns |
| IP reputation | 8% | AbuseIPDB confidence score |
| Device linkage | 8% | One device linked to multiple accounts |
| Account age | 8% | Newly created seller accounts |
| Order velocity | 8% | Spike in orders within 24 hours |
| Dispute rate | 4% | Customer-raised disputes |

The score maps to four decision levels:

```
0–29   → LOW      → ALLOW
30–54  → MEDIUM   → STEP_UP_VERIFICATION
55–74  → HIGH     → HUMAN_REVIEW
75–100 → CRITICAL → PAYOUT_HOLD
```

### 2. Transaction ML Model (XGBoost)

Trained on 5,000 synthetic samples mirroring real fraud patterns. Served via FastAPI at port 8000.

- **Predict endpoint** (`POST /predict`): returns `fraud_probability`, `is_fraud`, `confidence`
- **Explain endpoint** (`POST /explain`): uses SHAP TreeExplainer to return per-feature impact, direction, and magnitude — identifying which exact signal pushed the model toward fraud or safety

Features: `amount`, `refund_rate`, `account_age_days`, `ip_risk`, `device_linked_accounts`, `order_count_24h`, `disputed_rate`, `graph_risk`

### 3. Graph ML Model (GradientBoosting)

A second independent classifier trained on graph topology features extracted from Neo4j. Served at port 8001.

Features: `degree`, `clustering_coeff`, `pagerank`, `neighbor_fraud_rate`, `shared_device_count`, `shared_ip_count`, `total_transactions`, `avg_amount`, `refund_rate`

This model specifically catches fraud rings — clusters of otherwise-normal sellers who are connected through shared devices or IP addresses to known bad actors.

### 3a. Elliptic Graph Benchmark (technique validation)

The track asks the graph-based technique be *proven on real, labeled data*, not just our own synthetic network. We validate it on the **Elliptic Bitcoin Dataset** (`ml/graph/train_elliptic.py`) — the standard public benchmark for graph anomaly/collusion detection:

- **203,769 transaction nodes, 234,355 directed edges** (BTC flow), 4,545 labeled licit + 42,019 labeled illicit
- **Temporal split** (train = time-steps 1–34, test = 35–49), so the test set is genuinely unseen future data
- Download: `https://data.pyg.org/datasets/elliptic/{elliptic_txs_features,elliptic_txs_edgelist,elliptic_txs_classes}.csv.zip` → place in `ml/graph/data/`

Two XGBoost models are compared on the **same test transactions**:

| Model | Precision (illicit) | Recall (illicit) | F1 | AUC |
|---|---|---|---|---|
| Node features only (single-tx classifier) | 0.9810 | 0.9954 | 0.9882 | 0.9398 |
| **Node + Graph features** (degree, k-core, PageRank, clustering, neighbor illicit/licit priors) | **0.9829** | **0.9978** | **0.9903** | **0.9667** |

The key result: the graph-augmented model **caught 51 illicit transactions the node-only classifier missed** (reclassifying 56 to illicit; only 5 were false positives). These are exactly the "network-level patterns a single-transaction classifier misses" the problem statement asks for. Rank results differ because graph signals (neighbor-label priors, core number, degree) expose laundering clusters invisible to per-row features.

Run it: `.venv/bin/python train_elliptic.py` in `ml/graph/`. Models saved to `ml/graph/models/elliptic_{graph,baseline}.pkl`.

### 4. Neo4j Graph Database

The graph models four node types and their relationships:

```
(Customer) -[PLACED_ORDER]→ (Seller)
(Customer) -[USES_DEVICE]→  (Device)
(Customer) -[USES_IP]→      (IP)
(Seller)   -[RECEIVED_ORDER]→ (Customer)
```

The graph seed populates realistic fraud rings — multiple sellers sharing the same device or IP, which creates detectable clusters. The API exposes:

- Neighbor traversal with configurable depth
- Suspicious device detection (devices linked to 3+ accounts)
- Graph statistics (node counts, relationship types, PageRank signals)

### 5. Precision Guardrail

Before any automated action is triggered, the system checks a 95% precision threshold:

- `LOW` / `MEDIUM` risk → always automated
- `HIGH` risk → automated only if the model precision is ≥ 95% and sample size ≥ 100
- `CRITICAL` risk → always escalated to human review regardless of metrics

This prevents the system from incorrectly penalizing legitimate sellers at scale.

### 6. Fairness Monitoring

The fairness module calculates three standard metrics across seller groups:

- **Disparate Impact Ratio** — flags if any group's selection rate falls below 80% of the highest group
- **Equal Opportunity Difference** — checks true positive rate parity across groups
- **Demographic Parity Difference** — ensures prediction rates don't diverge significantly

Recommendations are surfaced automatically when any metric breaches its threshold.

### 7. Investigator Dashboard

The Next.js frontend provides a full fraud investigation workflow:

- **Cases** — table of all fraud cases, filterable by risk level, with per-case drill-down showing risk score breakdown, signals, and timeline
- **Sellers** — seller profiles with aggregated risk history
- **Transactions** — full transaction ledger with linked risk signals
- **Appeals** — sellers can submit appeals with evidence; reviewers can approve or reject with notes
- **Graph Visualizer** — interactive React Flow canvas showing the Neo4j neighborhood around any node, with minimap, zoom controls, node click details, and suspicious device highlights
- **Audit Log** — immutable record of every action taken on a case
- **Demo Page** — live scenario runner with four preset risk profiles (Low → Critical), showing real-time ML predictions, SHAP explanations, and AI narrative

### 8. AI Narrative Explanations

Every risk assessment generates a human-readable summary:

> "This transaction is flagged as high risk (72/100). Multiple concerning signals detected: Seller has unusually high refund activity and account was created recently."

The explanation is built from the risk signals and designed to be shown directly to fraud investigators without requiring them to interpret raw scores.

---

## Data Models

```
Seller ──< Order ──< Transaction ──< RiskSignal
  │
  └──< FraudCase ──< RiskSignal
             │
             ├──< Appeal
             └──< AuditLog
```

Key design decisions:
- `RiskSignal` is stored separately so every signal that contributed to a case is fully auditable
- `FraudCase` captures the final score, level, action, and reasons at the time of analysis — so historical records don't change if the model is retrained
- `Appeal` links back to `FraudCase` so the full appeal history is co-located with the original decision

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `GET  /health` | — | Service health check |
| `POST /api/risk/analyze` | — | Full risk analysis for a transaction |
| `GET  /api/cases` | `?level=` | List fraud cases, filter by level |
| `GET  /api/cases/:id` | — | Full case detail with signals and timeline |
| `GET  /api/sellers` | — | Paginated seller list |
| `GET  /api/sellers/:id` | — | Seller profile with fraud history |
| `GET  /api/transactions` | — | Transaction ledger |
| `GET  /api/appeals` | — | List seller appeals |
| `POST /api/appeals` | — | Submit a new appeal |
| `GET  /api/graph/stats` | — | Neo4j graph statistics |
| `GET  /api/graph/neighbors` | `?nodeId=&depth=` | Subgraph around a node |
| `GET  /api/fairness/report` | — | Fairness metrics across seller groups |
| `GET  /api/audit-logs` | — | System audit trail |

---

## Running the System

### Prerequisites

- Docker + Docker Compose
- Bun (for the Node.js backend)
- Python 3.10+ with `uv` or a standard `venv`
- Node.js 20+ (for the Next.js frontend)

### 1. Start Databases

```bash
docker compose up -d
```

This starts PostgreSQL on `5432` and Neo4j on `7474` (browser) / `7687` (bolt).

### 2. Seed Data

```bash
# PostgreSQL — sellers, orders, transactions, fraud cases
cd server && bun run db:seed

# Neo4j — graph nodes and relationships (fraud rings included)
bun run graph:seed
```

### 3. Train ML Models

```bash
# Transaction fraud model
cd ml/transaction
python -m venv .venv && source .venv/bin/activate
pip install xgboost scikit-learn shap fastapi uvicorn joblib pandas numpy
python train.py

# Graph fraud model
cd ../graph
python -m venv .venv && source .venv/bin/activate
pip install scikit-learn fastapi uvicorn joblib pandas numpy
python train.py
```

### 4. Start ML Services

```bash
# Terminal 1 — Transaction ML (XGBoost + SHAP)
cd ml/transaction && .venv/bin/uvicorn app:app --port 8000

# Terminal 2 — Graph ML
cd ml/graph && .venv/bin/uvicorn app:app --port 8001
```

### 5. Start the API

```bash
cd server && bun run dev
# Runs on http://localhost:4000
```

### 6. Start the Frontend

```bash
cd web && npm run dev
# Runs on http://localhost:3000
```

### 7. Environment Variables

**server/.env**
```env
DATABASE_URL=postgresql://trustgraph:trustgraph@localhost:5432/trustgraph
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=trustgraph
ML_SERVICE_URL=http://localhost:8000
GRAPH_ML_URL=http://localhost:8001
ABUSEIPDB_API_KEY=          # optional — falls back to mock scores
```

**web/.env**
```env
BETTER_AUTH_SECRET=your-secret-here
DATABASE_URL=postgresql://trustgraph:trustgraph@localhost:5432/trustgraph
```

---

## How a Risk Analysis Works (End to End)

1. A `POST /api/risk/analyze` request arrives with a `transactionId`
2. The API loads the transaction, seller profile, and recent order history from PostgreSQL
3. It queries Neo4j to find the seller's graph neighborhood and compute a graph risk score
4. It calls the XGBoost service (`/predict`) for a transaction fraud probability
5. It calls the Graph ML service (`/predict`) using Neo4j-derived features
6. The TypeScript risk engine combines all signals using the weighted scoring formula
7. The precision guardrail checks whether the resulting action can be automated
8. An AI narrative is generated from the signals and reasons
9. The result is persisted as a `FraudCase` with all `RiskSignal` records attached
10. The API returns the full risk assessment to the dashboard

---

## Design Principles

**Explainability over black-box decisions.** Every fraud flag comes with SHAP feature attributions and a human-readable summary. Investigators can see exactly why a seller was flagged.

**Defense in depth.** Three independent fraud signals (rules, transaction ML, graph ML) must converge before a high risk score is generated. Any single signal being noisy doesn't collapse the whole system.

**Precision over recall.** The guardrail enforces 95% precision on automated actions. It is better to send borderline cases to human review than to incorrectly penalize legitimate sellers.

**Auditability.** Every action is logged. Risk signals are stored at the time of decision. Appeals create a documented review trail. Nothing is silently overwritten.
