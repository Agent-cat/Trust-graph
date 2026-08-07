import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import os

def generate_graph_features(n_nodes=2000):
    """Generate synthetic graph-based features for fraud detection."""
    np.random.seed(42)
    
    nodes = []
    for i in range(n_nodes):
        node_type = np.random.choice(['customer', 'seller'], p=[0.8, 0.2])
        
        # Graph features
        degree = np.random.poisson(3) + 1
        clustering = np.random.beta(2, 5)
        pagerank = np.random.exponential(0.001)
        
        # Neighborhood features
        neighbor_fraud_rate = np.random.beta(1, 10)
        shared_device_count = np.random.poisson(1)
        shared_ip_count = np.random.poisson(0.5)
        
        # Transaction features
        total_transactions = np.random.poisson(10)
        avg_amount = np.random.exponential(5000)
        refund_rate = np.random.beta(2, 5)
        
        # Label (fraud or not)
        fraud_prob = (
            neighbor_fraud_rate * 0.3 +
            float(shared_device_count > 2) * 0.2 +
            float(shared_ip_count > 2) * 0.15 +
            float(refund_rate > 0.5) * 0.2 +
            float(degree > 5) * 0.15
        )
        is_fraud = 1 if fraud_prob > 0.4 else 0
        
        nodes.append({
            'node_id': f'node_{i}',
            'node_type': node_type,
            'degree': degree,
            'clustering_coeff': clustering,
            'pagerank': pagerank,
            'neighbor_fraud_rate': neighbor_fraud_rate,
            'shared_device_count': shared_device_count,
            'shared_ip_count': shared_ip_count,
            'total_transactions': total_transactions,
            'avg_amount': avg_amount,
            'refund_rate': refund_rate,
            'is_fraud': is_fraud
        })
    
    return pd.DataFrame(nodes)

def train_graph_model():
    """Train a graph-based fraud detection model."""
    print("Generating graph features...")
    df = generate_graph_features(2000)
    
    print(f"Dataset shape: {df.shape}")
    print(f"Fraud rate: {df['is_fraud'].mean():.2%}")
    
    feature_cols = [
        'degree', 'clustering_coeff', 'pagerank',
        'neighbor_fraud_rate', 'shared_device_count', 'shared_ip_count',
        'total_transactions', 'avg_amount', 'refund_rate'
    ]
    
    X = df[feature_cols]
    y = df['is_fraud']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print("\nTraining Graph Fraud Model...")
    model = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    print("\n=== Model Performance ===")
    print(classification_report(y_test, y_pred))
    
    # Feature importance
    importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n=== Feature Importance ===")
    print(importance.to_string(index=False))
    
    os.makedirs('models', exist_ok=True)
    model_path = 'models/graph_fraud.pkl'
    joblib.dump(model, model_path)
    print(f"\nModel saved to {model_path}")
    
    return model

if __name__ == "__main__":
    train_graph_model()
