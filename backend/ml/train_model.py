import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

FEATURE_COLUMNS = ["amount", "hour", "is_new_device", "is_new_payee"]


def generate_synthetic_data(n_samples=10000, fraud_ratio=0.01):
    print(f"Generating {n_samples} transactions with {fraud_ratio * 100:.1f}% anomalous ratio...")
    
    # Safe transactions
    n_safe = int(n_samples * (1 - fraud_ratio))
    safe_data = {
        "amount": np.random.lognormal(mean=np.log(500), sigma=0.7, size=n_safe),
        "hour": np.random.randint(7, 22, size=n_safe),
        "is_new_device": np.random.choice([0, 1], p=[0.96, 0.04], size=n_safe),
        "is_new_payee": np.random.choice([0, 1], p=[0.88, 0.12], size=n_safe),
        "label": "safe",
    }
    
    # Anomalous transactions
    n_anomalous = n_samples - n_safe
    anomalous_data = {
        "amount": np.random.lognormal(mean=np.log(25000), sigma=0.9, size=n_anomalous),
        "hour": np.random.choice([2, 3, 4], p=[0.2, 0.6, 0.2], size=n_anomalous),
        "is_new_device": np.random.choice([0, 1], p=[0.05, 0.95], size=n_anomalous),
        "is_new_payee": np.random.choice([0, 1], p=[0.03, 0.97], size=n_anomalous),
        "label": "anomalous",
    }
    
    # Combine and shuffle
    df_safe = pd.DataFrame(safe_data)
    df_anomalous = pd.DataFrame(anomalous_data)
    
    df = pd.concat([df_safe, df_anomalous]).sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Feature engineering: model-ready numeric matrix.
    X = df[FEATURE_COLUMNS]
    
    return X, df


def train_model():
    # 1. Generate Data
    X, original_df = generate_synthetic_data()
    
    print("\nGenerated Dataset Sample (First 5 rows):")
    print(original_df.head())

    print("\nFeature Matrix (First 5 rows):")
    print(X.head())
    
    # 2. Train Isolation Forest
    print("\nTraining Isolation Forest model...")
    # contamination helps the model define the threshold for anomalies
    model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
    model.fit(X)
    
    # 3. Test the model internally
    predictions = model.predict(X)
    # IsolationForest outputs 1 for normal, -1 for anomaly
    # We will convert it to 0 for normal, 1 for anomaly for easier understanding
    anomalies = np.where(predictions == -1, 1, 0)
    
    print(f"\nModel detected {sum(anomalies)} anomalies out of {len(X)} transactions.")
    print("\nSample Predictions (1 = anomaly, 0 = safe):")
    print(original_df.assign(predicted_anomaly=anomalies).head(10))
    
    # 4. Save the model
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    model_path = os.path.join(os.path.dirname(__file__), "fraud_model.pkl")
    joblib.dump(model, model_path)
    print(f"\nModel successfully saved to {model_path}")


if __name__ == "__main__":
    train_model()
