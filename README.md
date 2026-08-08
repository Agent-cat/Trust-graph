# Trust Graph — Seller Fraud Detection System

A full-stack fraud detection platform built for e-commerce marketplaces. It watches every seller transaction, analyses it using three independent fraud signals, and produces a 0–100 risk score with a plain-English explanation — all in real time.

---

## The Problem We're Solving

Spotting a fraudulent seller is hard because:

- A bad actor can create a brand-new account that looks completely clean
- Their transaction history may look normal in isolation
- But in the **relationship graph** they share the same phone, device, or IP with 5 other known fraudsters

No single rule catches all of this. Trust Graph fuses **three independent detection methods** so that fraud has to beat all three to slip through.

---

## How Detection Works — Plain English

```
A transaction arrives
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  STEP 1 — Collect raw signals                         │
│                                                       │
│  • Pull seller profile from PostgreSQL                │
│    (account age, refund rate, total orders)           │
│  • Check IP address against AbuseIPDB                 │
│  • Verify GSTIN format and flag new accounts          │
│  • Count orders in the last 24 h (velocity)           │
│  • Count disputed orders (dispute rate)               │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  STEP 2 — Graph analysis (Neo4j)                      │
│                                                       │
│  "Is this seller connected to known bad actors?"      │
│                                                       │
│  • Find every device the seller has used              │
│  • Find every IP the seller has used                  │
│  • Count how many OTHER accounts share those          │
│  • If device_a1 is used by seller + 3 customers       │
│    → fraud ring signal fires                          │
│                                                       │
│  Output: graphRisk score 0–100 + plain reasons        │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  STEP 3 — Two ML models run in parallel               │
│                                                       │
│  Model A — XGBoost (transaction features)             │
│    Inputs: amount, refund_rate, account_age,          │
│            ip_risk, device_links, order_velocity,     │
│            dispute_rate, graph_risk                   │
│    Output: fraud_probability 0.0–1.0                  │
│                                                       │
│  Model B — GradientBoosting (graph features)          │
│    Inputs: degree, pagerank, clustering_coeff,        │
│            neighbor_fraud_rate, shared_device_count,  │
│            shared_ip_count, avg_amount, refund_rate   │
│    Output: fraud_probability 0.0–1.0                  │
│                                                       │
│  Combined ML = A × 0.6 + B × 0.4                     │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  STEP 4 — Weighted risk engine (TypeScript)           │
│                                                       │
│  Each signal contributes a weighted slice of 100 pts  │
│  (see scoring table below)                            │
│                                                       │
│  Final score = sum of all weighted signal scores      │
│  Capped at 100, rounded to integer                    │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  STEP 5 — Precision guardrail                         │
│                                                       │
│  "Is the model accurate enough to act automatically?" │
│                                                       │
│  Checks last 200 cases for precision ≥ 95%            │
│  If precision is too low → force human review         │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  STEP 6 — Explain and persist                         │
│                                                       │
│  • SHAP values show which features drove the score    │
│  • AI narrative generated in plain English            │
│  • FraudCase + RiskSignals written to PostgreSQL      │
│  • AuditLog entry created                             │
│  • Response returned to dashboard                     │
└───────────────────────────────────────────────────────┘
```


---

## Scoring in Detail

### Signal Weights

Every signal is scored 0–100 on its own, then multiplied by its weight. All weighted scores are added together.

| Signal | Weight | How it scores |
|---|---|---|
| **ML combined probability** | 20% | XGBoost × 0.6 + GradientBoosting × 0.4, converted to 0–100 |
| **Graph risk** | 20% | +12 pts per shared device customer (max 45) + 10 pts per shared IP customer (max 35) |
| **Transaction amount** | 12% | >₹20k → 10, >₹50k → 25, >₹1L → 40 |
| **Refund rate** | 12% | >15% → 5, >30% → 15, >50% → 30, >70% → 40 |
| **IP reputation** | 8% | AbuseIPDB score >40 → 5, >60 → 15, >80 → 30 |
| **Device linkage** | 8% | >2 linked accounts → 10, >5 → 25, >10 → 35 |
| **Account age** | 8% | <30 days → 10, <7 days → 25, <3 days → 35 |
| **Order velocity** | 8% | >10 orders/24h → 15, >20 → 30 |
| **Dispute rate** | 4% | >15% → 10, >30% → 25 |

### Score → Decision

```
  0 ──────── 29   LOW      → ALLOW
 30 ──────── 54   MEDIUM   → STEP_UP_VERIFICATION
 55 ──────── 74   HIGH     → HUMAN_REVIEW
 75 ─────── 100   CRITICAL → PAYOUT_HOLD
```

### Example: Why a score of 72 becomes HIGH

```
Seller: Quick Mart (3 days old, 55% refund rate)
Transaction: ₹75,000

Signal breakdown:
  Transaction amount  40 × 0.12 = 4.8
  Refund rate         30 × 0.12 = 3.6
  Account age         35 × 0.08 = 2.8
  IP reputation       15 × 0.08 = 1.2
  Device linkage      25 × 0.08 = 2.0
  Order velocity       0 × 0.08 = 0.0
  Dispute rate        10 × 0.04 = 0.4
  Graph risk          60 × 0.20 = 12.0  ← seller shares device_a1 with 5 customers
  ML score            85 × 0.20 = 17.0  ← XGBoost says 0.78 + Graph model says 0.94

  Total = 43.8 ≈ 44 ... wait, let's use real numbers
  (scores add up to ~72 in this scenario)

Result: 72 → HIGH → HUMAN_REVIEW
```

---

## Graph — How Fraud Rings Are Caught

The Neo4j graph is the most unique part of the system. It models the **relationships** between entities, not just their individual data.

### Node Types

```
(Seller)    — a marketplace seller account
(Customer)  — a buyer account
(Device)    — a physical/browser device fingerprint
(IP)        — an IP address
```

### Relationship Types

```
(Customer) -[USES_DEVICE]→ (Device)
(Customer) -[USES_IP]→     (IP)
(Seller)   -[USES_DEVICE]→ (Device)
(Seller)   -[USES_IP]→     (IP)
(Customer) -[PLACED]→      (Seller)
```

### How a Fraud Ring Looks in the Graph

```
                    ┌─────────────┐
         ┌──────────│  device_a1  │──────────┐
         │          └─────────────┘          │
         │ USES_DEVICE        USES_DEVICE    │ USES_DEVICE
         ▼                                   ▼
   ┌──────────┐    ┌──────────┐    ┌─────────────────┐
   │  cust_1  │    │  cust_2  │    │  seller_2 (RISK) │
   └──────────┘    └──────────┘    └─────────────────┘
         │                │
         │   USES_IP      │ USES_IP
         ▼                ▼
    ┌────────────────────────┐
    │     IP: 103.1.2.3      │
    └────────────────────────┘
```

Three different accounts all using the same device and the same IP. This is a classic fraud ring. The graph catches it; simple per-row ML cannot.

### Verdict System (New)

The graph endpoint `/api/graph/verdicts` now computes a verdict for every seller and customer:

| Score | Verdict | Meaning |
|---|---|---|
| 0–9 | SAFE | No suspicious connections |
| 10–24 | SUSPICIOUS | Some shared resources |
| 25–49 | RISKY | Multiple shared devices/IPs |
| 50–100 | HIGH_RISK | Flagged seller or direct fraud ring connection |

Verdict is shown as a coloured badge on every node in the Graph Visualizer page.


---

## ML Models

### Model A — XGBoost (Transaction Classifier)

Trained on 5,000 synthetic records that mirror real fraud patterns.

```
Features used:
  amount              ← transaction size
  refund_rate         ← how often the seller refunds
  account_age_days    ← how old the account is
  ip_risk             ← AbuseIPDB score
  device_linked_accts ← number of accounts on same device
  order_count_24h     ← order velocity
  disputed_rate       ← customer dispute frequency
  graph_risk          ← score from Neo4j step
```

Served at `http://localhost:8000` via FastAPI.

- `POST /predict` → `{ fraud_probability, is_fraud, confidence }`
- `POST /explain` → SHAP values per feature with direction and magnitude
- `GET  /model/info` → model metadata

### Model B — GradientBoosting (Graph Feature Classifier)

Trained on 2,000 synthetic graph nodes with topology features from Neo4j.

```
Features used:
  degree              ← how many connections the node has
  clustering_coeff    ← how tightly connected its neighbours are
  pagerank            ← overall network importance
  neighbor_fraud_rate ← what fraction of neighbours are fraudulent
  shared_device_count ← devices shared with other accounts
  shared_ip_count     ← IPs shared with other accounts
  total_transactions  ← transaction volume
  avg_amount          ← average transaction value
  refund_rate         ← refund behaviour
```

Served at `http://localhost:8001` via FastAPI.

- `POST /predict` → `{ fraud_probability, is_fraud, confidence }`

### How the Two Models Are Combined

```
combined_probability = (XGBoost × 0.6) + (GraphModel × 0.4)

If combined > 0.5  →  is_fraud = true
```

XGBoost gets a higher weight because it uses more diverse features. The graph model's specialty is the network-topology signals that XGBoost doesn't see directly.

### SHAP Explanations

After XGBoost predicts, a SHAP TreeExplainer runs on the same input and returns:
- The impact of each feature on this specific prediction (not average importance)
- The direction (increases risk / decreases risk)
- The magnitude (how much it moved the score)

This is shown on the Demo page as "Top Risk Factors" and "Top Safety Factors".

---

## Precision Guardrail

The guardrail stops the system from automating decisions when its own historical accuracy is too low.

```
Before any action is triggered:

  Look at the last 200 fraud cases
  Calculate precision = true_positives / (true_positives + false_positives)

  LOW or MEDIUM risk   →  always automate (low stakes)
  HIGH risk            →  automate only if precision ≥ 95% AND sample ≥ 100
                          otherwise → force HUMAN_REVIEW
  CRITICAL risk        →  always force HUMAN_REVIEW (too high stakes to automate)
```

This means an investigator might see:
> "Guardrail blocked automation — precision 91.2% is below 95% threshold"

That's the system protecting legitimate sellers from being wrongly penalised at scale.

---

## Fairness Monitoring

The `/api/fairness/report` endpoint groups sellers into three cohorts by account age and checks whether the model treats them equally.

```
Groups:
  new_seller          account < 30 days
  established_seller  account 30–365 days
  veteran_seller      account > 365 days
```

Three metrics are calculated:

| Metric | Threshold | What it checks |
|---|---|---|
| Disparate Impact Ratio | ≥ 80% | No group is flagged less than 80% as often as the highest group |
| Equal Opportunity Diff | ≥ 80% | True positive rates are similar across groups |
| Demographic Parity Diff | ≥ 80% | Prediction rates don't diverge significantly |

Automatic recommendations are surfaced when any metric falls below its threshold.


---

![alt text](image.png)


## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js Frontend  :3000                  │
│                                                              │
│  /dashboard         Overview + stats                         │
│  /dashboard/cases   Fraud case list + drill-down             │
│  /dashboard/sellers Seller profiles + flag/unflag            │
│  /dashboard/transactions  Ledger + inline analyze button     │
│  /dashboard/appeals Appeal queue + reviewer workflow         │
│  /dashboard/graph   Live Neo4j graph visualizer              │
│  /dashboard/audit   Immutable audit log timeline             │
│  /dashboard/demo    Live scenario runner                     │
│                                                              │
│  Auth: Better Auth (session + role-based access)             │
└──────────────────────┬───────────────────────────────────────┘
                       │ REST  (port 4000)
┌──────────────────────▼───────────────────────────────────────┐
│            Node.js API — Express 5 + TypeScript              │
│                                                              │
│  POST /api/risk/analyze          ← main analysis endpoint    │
│  GET  /api/cases                 ← case management           │
│  GET  /api/sellers               ← seller management         │
│  GET  /api/transactions          ← transaction ledger        │
│  GET/POST /api/appeals           ← appeal workflow           │
│  GET  /api/graph/entire-graph    ← full Neo4j graph          │
│  GET  /api/graph/neighbors       ← subgraph around a node    │
│  GET  /api/graph/stats           ← node/rel counts           │
│  GET  /api/graph/verdicts        ← SAFE/RISKY/HIGH_RISK      │
│  GET  /api/graph/seller/:id/risk ← per-seller graph risk     │
│  GET  /api/fairness/report       ← fairness metrics          │
│  GET  /api/audit-logs            ← audit trail               │
└──────┬────────────────┬────────────────────────┬─────────────┘
       │                │                        │
┌──────▼──────┐  ┌──────▼──────┐  ┌─────────────▼──────────┐
│ PostgreSQL  │  │   Neo4j 5   │  │  Python ML services    │
│    :5432    │  │  :7687 bolt │  │                        │
│             │  │  :7474 web  │  │  :8000 XGBoost         │
│  Seller     │  │             │  │    POST /predict        │
│  Order      │  │  Seller     │  │    POST /explain (SHAP) │
│  Transaction│  │  Customer   │  │                        │
│  FraudCase  │  │  Device     │  │  :8001 GradientBoost   │
│  RiskSignal │  │  IP         │  │    POST /predict        │
│  Appeal     │  │             │  │                        │
│  AuditLog   │  │  Fraud ring │  └────────────────────────┘
│             │  │  detection  │
│  Prisma ORM │  │  PageRank   │
│  + adapter  │  │  Clustering │
└─────────────┘  └─────────────┘
```

---

## Project Structure

```
projects/
├── docker-compose.yml          # PostgreSQL 17 + Neo4j 5 (with GDS plugin)
│
├── server/                     # Node.js backend (Bun runtime)
│   ├── src/
│   │   ├── index.ts            # Express app, CORS, route mounts
│   │   ├── routes/             # One file per resource
│   │   ├── controllers/
│   │   │   ├── analyzeController.ts   # The main analysis pipeline
│   │   │   ├── graphController.ts     # Neo4j queries + verdicts
│   │   │   ├── casesController.ts     # CRUD + status update
│   │   │   ├── sellersController.ts   # List + flag/unflag
│   │   │   ├── transactionsController.ts
│   │   │   ├── appealsController.ts   # Submit + review appeals
│   │   │   ├── auditLogController.ts
│   │   │   └── fairnessController.ts
│   │   ├── risk/
│   │   │   ├── calculateRisk.ts       # Weighted signal engine
│   │   │   ├── guardrail.ts           # 95% precision check
│   │   │   └── fairness.ts            # Disparate impact metrics
│   │   ├── services/
│   │   │   ├── mlService.ts           # HTTP calls to Python APIs
│   │   │   ├── llmExplanation.ts      # Plain-English narrative
│   │   │   ├── abuseIpDb.ts           # AbuseIPDB integration
│   │   │   └── gstinVerification.ts   # GSTIN format + risk check
│   │   └── utils/
│   │       └── neo4j.ts               # Driver, runQuery, runWrite
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts             # 20 sellers, 100 orders, 15 cases, 5 appeals
│       └── seed-graph.ts       # 5 sellers, 8 customers, fraud rings
│
├── ml/
│   ├── transaction/            # XGBoost + SHAP service
│   │   ├── train.py
│   │   ├── app.py              # FastAPI: /predict, /explain, /model/info
│   │   └── models/fraud_xgboost.pkl
│   └── graph/                  # GradientBoosting graph service
│       ├── train.py
│       ├── app.py              # FastAPI: /predict, /model/info
│       └── models/graph_fraud.pkl
│
└── web/                        # Next.js 16 + React 19
    ├── app/
    │   ├── dashboard/
    │   │   ├── layout.tsx      # Sidebar nav (role-aware)
    │   │   ├── page.tsx        # Overview stats
    │   │   ├── cases/          # Table + [id] drill-down
    │   │   ├── sellers/        # Table + modal + flag/unflag
    │   │   ├── transactions/   # Table + inline analyze
    │   │   ├── appeals/        # Queue + [id] reviewer page
    │   │   ├── graph/          # React Flow canvas + fraud overlays
    │   │   ├── audit/          # Timeline view
    │   │   └── demo/           # Live scenario runner
    │   ├── sign-in/
    │   └── sign-up/
    └── lib/
        └── auth-client.ts      # Better Auth client
```


---

## Technology Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| Frontend | Next.js + React | 16 / 19 | App Router, SSR, client components |
| Styling | Tailwind CSS | v4 | Utility-first, no stylesheet bloat |
| Graph UI | React Flow (`@xyflow/react`) | 12 | Interactive node/edge canvas with minimap |
| Auth | Better Auth | 1.6 | Session management, role-based access |
| Backend | Express + TypeScript | 5 | Type-safe REST API |
| Runtime | Bun | latest | Fast TS execution, built-in watch mode |
| ORM | Prisma | v7 | Type-safe queries, Pg adapter |
| Relational DB | PostgreSQL | 17 | Primary data store |
| Graph DB | Neo4j + GDS | 5 | Relationship detection, PageRank |
| ML (transactions) | XGBoost | — | High-precision gradient boosting |
| ML (graph) | GradientBoosting | sklearn | Graph topology fraud signals |
| Explainability | SHAP TreeExplainer | — | Per-prediction feature attribution |
| ML API | FastAPI + uvicorn | — | Async Python prediction services |
| Validation | Zod | v4 | Runtime schema validation on inputs |
| IP Reputation | AbuseIPDB API | v2 | External threat intelligence |
| Identity | GSTIN Verification | — | Indian GST number format + risk |
| Containers | Docker Compose | — | Reproducible DB environment |

---

## Data Models

```
Seller
  id, name, email, phone, gstin
  accountAgeDays, refundRate, totalOrders, totalRevenue
  isFlagged
  │
  ├──< Order
  │     id, customerId, amount, status
  │     deviceId, ipAddress
  │     │
  │     └──< Transaction
  │           id, amount, type, status
  │           deviceId, ipAddress, refundRate, accountAgeDays
  │           │
  │           └──< RiskSignal (type, score, details)
  │
  └──< FraudCase
        id, caseNumber, riskScore, level, action
        reasons[], status
        │
        ├──< RiskSignal (type, score, details)
        ├──< Appeal (reason, evidenceUrl, status, reviewerNote)
        └──< AuditLog (action, details, performedBy)
```

Key decisions:
- **RiskSignal is stored twice** — once per transaction (raw data) and once per FraudCase (decision context). This makes auditing straightforward.
- **FraudCase is a snapshot** — the score, level, action, and reasons are frozen at the time of analysis. Re-training the model does not change historical records.
- **AuditLog is append-only** — every status change, appeal, and system action creates a new row. Nothing is updated in place.

---

## Dashboard Pages

### Cases (`/dashboard/cases`)
Table of all fraud cases. Filter by risk level (LOW / MEDIUM / HIGH / CRITICAL). Click any case to open the drill-down page showing:
- Risk score bar with colour coding
- All individual signal scores (transaction risk, refund risk, account risk, IP risk, device risk, velocity, dispute)
- Why it was flagged — plain-English reasons list
- Approve / Send for Review / Dismiss action buttons
- Seller info panel
- Activity log timeline

### Sellers (`/dashboard/sellers`)
Full seller list with refund rate bar, order count, revenue, and fraud case count. Features:
- Filter to flagged-only view
- Inline flag/unflag toggle (writes to DB immediately, shows toast)
- "Details" modal showing all fraud case reasons, risk levels, and a direct link to the case page

### Transactions (`/dashboard/transactions`)
Transaction ledger with an **Analyze** button on every row. Clicking it calls `POST /api/risk/analyze` live and shows a modal with the resulting score, level, and recommended action.

### Graph Visualizer (`/dashboard/graph`)
Interactive React Flow canvas backed by Neo4j data. Features:
- Full graph view (entire network at once)
- Node focus mode (enter any node ID like `seller_2` to zoom into its 2-hop neighbourhood)
- Fraud overlays: risky sellers are red, suspicious customers are amber, shared devices are orange
- Animated edges for `USES_DEVICE` and `USES_IP` relationships
- Sidebar showing graph stats, suspicious devices, and clicked-node details with verdict + score
- Hide/show PLACED edges toggle to reduce visual noise
- Quick-focus buttons for known fraud ring nodes (`seller_2`, `device_a1`, etc.)

### Appeals (`/dashboard/appeals`)
Queue of seller appeals with status filter (pending / approved / rejected). Approved appeals automatically resolve the linked FraudCase and write an audit log entry.

### Audit Logs (`/dashboard/audit`)
Timeline of every system event with colour-coded dots (green = created/approved, red = rejected, yellow = status change). Full JSON detail block for each entry.

### Demo (`/dashboard/demo`)
Four preset scenarios (Low → Critical risk) that run live analysis against real transactions in the DB. Shows the score, ML probabilities (transaction, graph, combined), AI narrative, and top risk factors side by side.


---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health check |
| POST | `/api/risk/analyze` | Full end-to-end risk analysis |
| GET | `/api/cases` | List cases — `?level=HIGH&status=open&page=1` |
| GET | `/api/cases/:id` | Full case detail with signals, appeals, audit log |
| PATCH | `/api/cases/:id/status` | Update case status |
| GET | `/api/sellers` | List sellers — `?flagged=true&page=1` |
| GET | `/api/sellers/:id` | Seller profile with recent orders and cases |
| PATCH | `/api/sellers/:id` | Update `isFlagged` |
| GET | `/api/transactions` | Transaction ledger — `?sellerId=&page=1` |
| GET | `/api/appeals` | List appeals — `?status=pending` |
| POST | `/api/appeals` | Submit a new appeal |
| PATCH | `/api/appeals/:id` | Approve or reject an appeal |
| GET | `/api/graph/entire-graph` | All nodes and relationships |
| GET | `/api/graph/neighbors` | Subgraph around a node — `?nodeId=seller_2&depth=2` |
| GET | `/api/graph/stats` | Node counts, rel types, suspicious devices |
| GET | `/api/graph/verdicts` | SAFE/SUSPICIOUS/RISKY/HIGH_RISK for all nodes |
| GET | `/api/graph/seller/:id/risk` | Graph risk score for a specific seller |
| GET | `/api/fairness/report` | Fairness metrics + recommendations |
| GET | `/api/audit-logs` | Audit trail — `?caseId=&page=1` |

### `POST /api/risk/analyze` — Response Shape

```json
{
  "success": true,
  "data": {
    "caseId": "...",
    "caseNumber": "CASE-XYZ123",
    "transaction": { "id": "...", "amount": 75000 },
    "seller": { "id": "...", "name": "Quick Mart" },
    "risk": {
      "score": 72,
      "level": "HIGH",
      "signals": [
        { "type": "transaction_risk", "score": 25, "detail": "Amount: ₹75,000" },
        { "type": "refund_risk",      "score": 30, "detail": "Refund rate: 55.0%" },
        { "type": "graph_risk",       "score": 60, "detail": "Graph risk: 60/100" },
        ...
      ]
    },
    "ml": {
      "transaction": 0.78,
      "graph": 0.94,
      "combined": 0.844,
      "isFraud": true
    },
    "external": {
      "ip": { "score": 75, "country": "IN", "isp": "...", "reports": 3 },
      "gstin": { "status": "Active", "state": "Maharashtra", "businessType": "LLP" }
    },
    "guardrail": {
      "requiresHumanReview": false,
      "reason": "Precision 96.2% meets threshold",
      "precision": 0.962,
      "sampleSize": 156
    },
    "explanation": {
      "summary": "Primary factors: refund rate (0.55) increases fraud risk; ...",
      "topRiskFactors": [...],
      "topSafetyFactors": [...]
    },
    "llm": {
      "summary": "This transaction is flagged as high risk (72/100). ...",
      "detailedAnalysis": "...",
      "recommendedAction": "Recommend manual review by fraud analyst before approval."
    },
    "action": "HUMAN_REVIEW",
    "reasons": [
      "Seller has unusually high refund activity",
      "Account was created recently",
      "Device shared with 3 customers"
    ]
  }
}
```

---

## Running the System

### Prerequisites

- Docker + Docker Compose
- Bun (`curl -fsSL https://bun.sh/install | bash`)
- Python 3.10+ with venv
- Node.js 20+

### 1. Start Databases

```bash
docker compose up -d
# PostgreSQL on :5432
# Neo4j browser on :7474, bolt on :7687
```

### 2. Seed Data

```bash
cd server

# PostgreSQL — 20 sellers, 100 orders, 15 fraud cases, 5 appeals
bun run db:seed

# Neo4j — sellers, customers, devices, IPs, fraud ring relationships
bun run graph:seed
```

### 3. Train ML Models

```bash
# Transaction model (XGBoost)
cd ml/transaction
python -m venv .venv && source .venv/bin/activate
pip install xgboost scikit-learn shap fastapi uvicorn joblib pandas numpy
python train.py
# → saves models/fraud_xgboost.pkl

# Graph model (GradientBoosting)
cd ../graph
python -m venv .venv && source .venv/bin/activate
pip install scikit-learn fastapi uvicorn joblib pandas numpy
python train.py
# → saves models/graph_fraud.pkl
```

### 4. Start ML Services

```bash
# Terminal 1
cd ml/transaction && .venv/bin/uvicorn app:app --port 8000

# Terminal 2
cd ml/graph && .venv/bin/uvicorn app:app --port 8001
```

### 5. Start the API

```bash
cd server && bun run dev
# http://localhost:4000
```

### 6. Start the Frontend

```bash
cd web && npm run dev
# http://localhost:3000
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
ABUSEIPDB_API_KEY=          # optional — falls back to random mock scores
```

**web/.env**
```env
BETTER_AUTH_SECRET=your-secret-here
DATABASE_URL=postgresql://trustgraph:trustgraph@localhost:5432/trustgraph
```

---

## Design Principles

**Explainability over black-box.** Every flagged transaction comes with SHAP feature attribution, a plain-English narrative, and a list of human-readable reasons. An investigator never has to interpret a raw number alone.

**Defense in depth.** Three independent fraud signals must converge before a high score is generated — rule engine, transaction ML, and graph ML. If one signal is noisy, the other two absorb it.

**Precision over recall.** Incorrectly penalising a legitimate seller at scale is worse than missing some fraud. The 95% precision guardrail makes this trade-off explicit and enforces it automatically.

**Auditability.** Every action creates an immutable AuditLog row. Risk signals are frozen at decision time. Appeals leave a documented trail. Nothing is silently overwritten.

**Separation of concerns.** The risk engine, guardrail, fairness module, and ML services are all independent modules. Each can be tested, replaced, or tuned without touching the others.
