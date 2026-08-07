import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, precision_score, recall_score, f1_score
import joblib
import os

def generate_synthetic_data(n_samples=5000):
    """Generate synthetic fraud data for training."""
    np.random.seed(42)
    
    data = {
        'amount': np.random.exponential(10000, n_samples),
        'refund_rate': np.random.beta(2, 5, n_samples),
        'account_age_days': np.random.exponential(100, n_samples).astype(int),
        'ip_risk': np.random.uniform(0, 100, n_samples),
        'device_linked_accounts': np.random.poisson(2, n_samples),
        'order_count_24h': np.random.poisson(5, n_samples),
        'disputed_rate': np.random.beta(1, 10, n_samples),
        'graph_risk': np.random.uniform(0, 100, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Create fraud labels based on rules (similar to our TypeScript risk engine)
    fraud_prob = (
        (df['amount'] > 50000).astype(float) * 0.2 +
        (df['refund_rate'] > 0.5).astype(float) * 0.25 +
        (df['account_age_days'] < 7).astype(float) * 0.15 +
        (df['ip_risk'] > 70).astype(float) * 0.15 +
        (df['device_linked_accounts'] > 3).astype(float) * 0.15 +
        (df['graph_risk'] > 60).astype(float) * 0.1
    )
    
    # Add some noise
    fraud_prob += np.random.normal(0, 0.1, n_samples)
    fraud_prob = np.clip(fraud_prob, 0, 1)
    
    # Convert to binary labels
    df['is_fraud'] = (fraud_prob > 0.5).astype(int)
    
    return df

def train_model():
    """Train XGBoost model."""
    print("Generating synthetic training data...")
    df = generate_synthetic_data(5000)
    
    print(f"Dataset shape: {df.shape}")
    print(f"Fraud rate: {df['is_fraud'].mean():.2%}")
    
    # Features
    feature_cols = [
        'amount', 'refund_rate', 'account_age_days', 'ip_risk',
        'device_linked_accounts', 'order_count_24h', 'disputed_rate', 'graph_risk'
    ]
    
    X = df[feature_cols]
    y = df['is_fraud']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print("\nTraining XGBoost model...")
    model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    print("\n=== Model Performance ===")
    print(classification_report(y_test, y_pred))
    
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    
    # Feature importance
    importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n=== Feature Importance ===")
    print(importance.to_string(index=False))
    
    # Save model
    os.makedirs('models', exist_ok=True)
    model_path = 'models/fraud_xgboost.pkl'
    joblib.dump(model, model_path)
    print(f"\nModel saved to {model_path}")
    
    return model, precision

if __name__ == "__main__":
    model, precision = train_model()
    print(f"\nFinal precision: {precision:.4f}")
