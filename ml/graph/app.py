from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI(title="Graph Fraud Detection ML Service")

model = None

class GraphPredictionRequest(BaseModel):
    degree: int
    clustering_coeff: float
    pagerank: float
    neighbor_fraud_rate: float
    shared_device_count: int
    shared_ip_count: int
    total_transactions: int
    avg_amount: float
    refund_rate: float

class GraphPredictionResponse(BaseModel):
    fraud_probability: float
    is_fraud: bool
    confidence: float

@app.on_event("startup")
async def load_model():
    global model
    model_path = "models/graph_fraud.pkl"
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        print(f"Graph model loaded from {model_path}")

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/predict", response_model=GraphPredictionResponse)
async def predict(request: GraphPredictionRequest):
    if model is None:
        return GraphPredictionResponse(fraud_probability=0.0, is_fraud=False, confidence=0.0)
    
    features = np.array([[
        request.degree,
        request.clustering_coeff,
        request.pagerank,
        request.neighbor_fraud_rate,
        request.shared_device_count,
        request.shared_ip_count,
        request.total_transactions,
        request.avg_amount,
        request.refund_rate
    ]])
    
    fraud_prob = model.predict_proba(features)[0][1]
    is_fraud = fraud_prob > 0.5
    confidence = max(fraud_prob, 1 - fraud_prob)
    
    return GraphPredictionResponse(
        fraud_probability=round(fraud_prob, 4),
        is_fraud=is_fraud,
        confidence=round(confidence, 4)
    )

@app.get("/model/info")
async def model_info():
    if model is None:
        return {"error": "Model not loaded"}
    return {
        "type": "GradientBoosting (Graph Features)",
        "features": [
            "degree", "clustering_coeff", "pagerank",
            "neighbor_fraud_rate", "shared_device_count", "shared_ip_count",
            "total_transactions", "avg_amount", "refund_rate"
        ]
    }
