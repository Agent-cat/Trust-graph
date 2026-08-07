from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import shap
import os

app = FastAPI(title="Fraud Detection ML Service")

# Load model on startup
model = None
explainer = None

FEATURE_NAMES = [
    'amount', 'refund_rate', 'account_age_days', 'ip_risk',
    'device_linked_accounts', 'order_count_24h', 'disputed_rate', 'graph_risk'
]

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

class ExplanationResponse(BaseModel):
    prediction: float
    summary: str
    explanations: list
    top_risk_factors: list
    top_safety_factors: list

@app.on_event("startup")
async def load_model():
    global model, explainer
    model_path = "models/fraud_xgboost.pkl"
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        explainer = shap.TreeExplainer(model)
        print(f"Model loaded from {model_path}")

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    if model is None:
        return PredictionResponse(fraud_probability=0.0, is_fraud=False, confidence=0.0)
    
    features = np.array([[
        request.amount, request.refund_rate, request.account_age_days,
        request.ip_risk, request.device_linked_accounts, request.order_count_24h,
        request.disputed_rate, request.graph_risk
    ]])
    
    fraud_prob = model.predict_proba(features)[0][1]
    is_fraud = fraud_prob > 0.5
    confidence = max(fraud_prob, 1 - fraud_prob)
    
    return PredictionResponse(
        fraud_probability=round(fraud_prob, 4),
        is_fraud=is_fraud,
        confidence=round(confidence, 4)
    )

@app.post("/explain", response_model=ExplanationResponse)
async def explain(request: PredictionRequest):
    if model is None or explainer is None:
        return ExplanationResponse(
            prediction=0.0, summary="Model not loaded",
            explanations=[], top_risk_factors=[], top_safety_factors=[]
        )
    
    features = np.array([[
        request.amount, request.refund_rate, request.account_age_days,
        request.ip_risk, request.device_linked_accounts, request.order_count_24h,
        request.disputed_rate, request.graph_risk
    ]])
    
    shap_values = explainer.shap_values(features)
    fraud_prob = model.predict_proba(features)[0][1]
    
    explanations = []
    for name, value, shap_val in zip(FEATURE_NAMES, features[0], shap_values[0]):
        explanations.append({
            "feature": name,
            "value": float(value),
            "impact": float(shap_val),
            "direction": "increases" if shap_val > 0 else "decreases",
            "magnitude": abs(float(shap_val))
        })
    
    explanations.sort(key=lambda x: x["magnitude"], reverse=True)
    
    # Generate summary
    top_factors = explanations[:3]
    summary_parts = []
    for exp in top_factors:
        feature_name = exp['feature'].replace('_', ' ')
        if exp['direction'] == 'increases':
            summary_parts.append(f"{feature_name} ({exp['value']:.2f}) increases fraud risk")
        else:
            summary_parts.append(f"{feature_name} ({exp['value']:.2f}) decreases fraud risk")
    
    summary = "Primary factors: " + "; ".join(summary_parts)
    
    return ExplanationResponse(
        prediction=float(fraud_prob),
        summary=summary,
        explanations=explanations,
        top_risk_factors=[e for e in explanations if e['direction'] == 'increases'][:3],
        top_safety_factors=[e for e in explanations if e['direction'] == 'decreases'][:3]
    )

@app.get("/model/info")
async def model_info():
    if model is None:
        return {"error": "Model not loaded"}
    return {
        "type": "XGBoost",
        "features": FEATURE_NAMES,
        "n_estimators": model.n_estimators,
        "max_depth": model.max_depth
    }
