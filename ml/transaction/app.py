from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI(title="Fraud Detection ML Service")

# Load model on startup
model = None

class PredictionRequest(BaseModel):
    amount: float
    refund_rate: float
    account_age_days: int
    ip_risk: float
    device_linked_accounts: int
    order_count_24h: int
    disputed_rate: float
    graph_risk: float

class PredictionResponse(BaseModel):
    fraud_probability: float
    is_fraud: bool
    confidence: float

@app.on_event("startup")
async def load_model():
    global model
    model_path = "models/fraud_xgboost.pkl"
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        print(f"Model loaded from {model_path}")
    else:
        print(f"Warning: Model not found at {model_path}")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    if model is None:
        return PredictionResponse(
            fraud_probability=0.0,
            is_fraud=False,
            confidence=0.0
        )
    
    features = np.array([[
        request.amount,
        request.refund_rate,
        request.account_age_days,
        request.ip_risk,
        request.device_linked_accounts,
        request.order_count_24h,
        request.disputed_rate,
        request.graph_risk
    ]])
    
    fraud_prob = model.predict_proba(features)[0][1]
    is_fraud = fraud_prob > 0.5
    confidence = max(fraud_prob, 1 - fraud_prob)
    
    return PredictionResponse(
        fraud_probability=round(fraud_prob, 4),
        is_fraud=is_fraud,
        confidence=round(confidence, 4)
    )

@app.get("/model/info")
async def model_info():
    if model is None:
        return {"error": "Model not loaded"}
    
    return {
        "type": "XGBoost",
        "features": [
            "amount", "refund_rate", "account_age_days", "ip_risk",
            "device_linked_accounts", "order_count_24h", "disputed_rate", "graph_risk"
        ],
        "n_estimators": model.n_estimators,
        "max_depth": model.max_depth
    }
