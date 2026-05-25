import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

def generate_synthetic_data(n_samples=10000, fraud_ratio=0.01):
    print(f"Generating {n_samples} transactions with {fraud_ratio*100}% fraud ratio...")
    
    # Safe transactions
    n_safe = int(n_samples * (1 - fraud_ratio))
    safe_data = {
        'amount': np.random.lognormal(mean=np.log(500), sigma=0.8, size=n_safe),
        'hour': np.random.randint(6, 23, size=n_safe), # daytime hours
        'is_new_device': np.random.choice([0, 1], p=[0.95, 0.05], size=n_safe),
        'is_new_payee': np.random.choice([0, 1], p=[0.85, 0.15], size=n_safe),
        'distance_km': np.random.exponential(scale=15, size=n_safe)
    }
    
    # Fraud transactions (anomalies)
    n_fraud = int(n_samples * fraud_ratio)
    fraud_data = {
        'amount': np.random.lognormal(mean=np.log(15000), sigma=1.0, size=n_fraud),
        'hour': np.random.randint(0, 5, size=n_fraud), # night hours
        'is_new_device': np.random.choice([0, 1], p=[0.1, 0.9], size=n_fraud),
        'is_new_payee': np.random.choice([0, 1], p=[0.05, 0.95], size=n_fraud),
        'distance_km': np.random.exponential(scale=500, size=n_fraud) # impossible travel
    }
    
    # Combine and shuffle
    df_safe = pd.DataFrame(safe_data)
    df_fraud = pd.DataFrame(fraud_data)
    
    df = pd.concat([df_safe, df_fraud]).sample(frac=1).reset_index(drop=True)
    
    # Feature engineering (e.g. log amount to handle extreme skewness)
    df['log_amount'] = np.log1p(df['amount'])
    
    # Drop raw amount for training, keep log_amount
    features = ['log_amount', 'hour', 'is_new_device', 'is_new_payee', 'distance_km']
    X = df[features]
    
    return X, df

def train_model():
    # 1. Generate Data
    X, original_df = generate_synthetic_data()
    
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
    
    # 4. Save the model
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    model_path = os.path.join(os.path.dirname(__file__), 'fraud_model.pkl')
    joblib.dump(model, model_path)
    print(f"\nModel successfully saved to {model_path}")

if __name__ == "__main__":
    train_model()
