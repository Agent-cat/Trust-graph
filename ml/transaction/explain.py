import shap
import joblib
import numpy as np
import os

# Feature names
FEATURE_NAMES = [
    'amount', 'refund_rate', 'account_age_days', 'ip_risk',
    'device_linked_accounts', 'order_count_24h', 'disputed_rate', 'graph_risk'
]

# Load model
model = None

def load_model():
    global model
    model_path = "models/fraud_xgboost.pkl"
    if os.path.exists(model_path):
        model = joblib.load(model_path)

def explain_prediction(features: dict) -> dict:
    """Generate SHAP explanation for a single prediction."""
    if model is None:
        load_model()
    
    if model is None:
        return {"error": "Model not loaded"}
    
    # Prepare features
    feature_values = np.array([[
        features.get('amount', 0),
        features.get('refund_rate', 0),
        features.get('account_age_days', 0),
        features.get('ip_risk', 0),
        features.get('device_linked_accounts', 0),
        features.get('order_count_24h', 0),
        features.get('disputed_rate', 0),
        features.get('graph_risk', 0),
    ]])
    
    # Create SHAP explainer
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(feature_values)
    
    # Get base value
    base_value = explainer.expected_value
    
    # Get prediction
    fraud_prob = model.predict_proba(feature_values)[0][1]
    
    # Build explanation
    explanations = []
    for i, (name, value, shap_val) in enumerate(zip(FEATURE_NAMES, feature_values[0], shap_values[0])):
        explanations.append({
            "feature": name,
            "value": float(value),
            "impact": float(shap_val),
            "direction": "increases" if shap_val > 0 else "decreases",
            "magnitude": abs(float(shap_val))
        })
    
    # Sort by magnitude
    explanations.sort(key=lambda x: x["magnitude"], reverse=True)
    
    # Generate human-readable summary
    top_factors = explanations[:3]
    summary_parts = []
    
    for exp in top_factors:
        feature_name = exp['feature'].replace('_', ' ')
        if exp['direction'] == 'increases':
            summary_parts.append(f"{feature_name} ({exp['value']:.2f}) increases fraud risk")
        else:
            summary_parts.append(f"{feature_name} ({exp['value']:.2f}) decreases fraud risk")
    
    summary = "Primary factors: " + "; ".join(summary_parts)
    
    return {
        "prediction": float(fraud_prob),
        "base_value": float(base_value),
        "explanations": explanations,
        "summary": summary,
        "top_risk_factors": [
            e for e in explanations if e['direction'] == 'increases'
        ][:3],
        "top_safety_factors": [
            e for e in explanations if e['direction'] == 'decreases'
        ][:3]
    }

if __name__ == "__main__":
    # Test explanation
    test_features = {
        "amount": 75000,
        "refund_rate": 0.65,
        "account_age_days": 4,
        "ip_risk": 85,
        "device_linked_accounts": 8,
        "order_count_24h": 15,
        "disputed_rate": 0.25,
        "graph_risk": 70,
    }
    
    load_model()
    explanation = explain_prediction(test_features)
    
    print("\n=== SHAP Explanation ===")
    print(f"Prediction: {explanation['prediction']:.2%}")
    print(f"\nSummary: {explanation['summary']}")
    print(f"\nTop Risk Factors:")
    for f in explanation['top_risk_factors']:
        print(f"  - {f['feature']}: {f['impact']:.4f} ({f['direction']})")
    print(f"\nTop Safety Factors:")
    for f in explanation['top_safety_factors']:
        print(f"  - {f['feature']}: {f['impact']:.4f} ({f['direction']})")
