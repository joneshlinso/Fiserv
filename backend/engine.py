"""
engine.py — 5-layer composite risk scoring engine.

Each layer returns (sub_score: int 0-100, reason_code: str).
A weighted combiner fuses them into a final risk_score (0-100).
"""

import uuid
import os
from datetime import datetime, timedelta
from dateutil.parser import parse as parse_dt
from typing import Dict, List, Any, Tuple

import joblib
import pandas as pd

import state

# ──────────────────────────────────────────────────────
# REASON CODE CONSTANTS
# ──────────────────────────────────────────────────────
BURST_VELOCITY = "BURST_VELOCITY"
HIGH_VELOCITY = "HIGH_VELOCITY"
NEW_MERCHANT_HIGH_AMT = "NEW_MERCHANT_HIGH_AMT"
NEW_MERCHANT = "NEW_MERCHANT"
NEW_DEVICE_NEW_PAYEE = "NEW_DEVICE_NEW_PAYEE"
NEW_DEVICE = "NEW_DEVICE"
IMPOSSIBLE_GEO_JUMP = "IMPOSSIBLE_GEO_JUMP"
GEO_CHANGE = "GEO_CHANGE"
MIDNIGHT_TXN = "MIDNIGHT_TXN"
WEEKEND_TXN = "WEEKEND_TXN"
LINKED_TO_FRAUD_NODE = "LINKED_TO_FRAUD_NODE"
ML_ANOMALY = "ML_ANOMALY"
ML_MODEL_UNAVAILABLE = "ML_MODEL_UNAVAILABLE"
SAFE = "SAFE"

FEATURE_COLUMNS = ["amount", "hour", "is_new_device", "is_new_payee"]
MODEL_PATH = os.path.join(os.path.dirname(__file__), "ml", "fraud_model.pkl")

try:
    ml_model = joblib.load(MODEL_PATH)
except Exception:
    ml_model = None

# ──────────────────────────────────────────────────────
# TIER THRESHOLDS
# ──────────────────────────────────────────────────────
def risk_tier(score: int) -> str:
    if score >= 90:
        return "CRITICAL"
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


# ──────────────────────────────────────────────────────
# SIGNAL LAYER 1 — VELOCITY
# ──────────────────────────────────────────────────────
def _velocity(payer_id: str, amount: float, ts: datetime) -> Tuple[int, str]:
    """Sum of ₹ sent by payer in last 60 seconds."""
    window_start = ts - timedelta(seconds=60)

    # Record this transaction
    if payer_id not in state.velocity_log:
        state.velocity_log[payer_id] = []
    state.velocity_log[payer_id].append((ts, amount))

    # Prune entries older than 5 minutes to keep memory bounded
    state.velocity_log[payer_id] = [
        (t, a) for t, a in state.velocity_log[payer_id]
        if t >= ts - timedelta(minutes=5)
    ]

    # Sum in the 60-second window
    total = sum(a for t, a in state.velocity_log[payer_id] if t >= window_start)

    if total > 10_000:
        return 90, BURST_VELOCITY
    if total > 5_000:
        return 60, HIGH_VELOCITY
    return 0, SAFE


# ──────────────────────────────────────────────────────
# SIGNAL LAYER 2 — MERCHANT TRUST
# ──────────────────────────────────────────────────────
def _merchant_trust(payer_id: str, payee_id: str, amount: float) -> Tuple[int, str]:
    """How many times has this payer paid this payee before?"""
    history = state.merchant_history.get(payer_id, {})
    prior_count = history.get(payee_id, 0)

    # Update history AFTER reading
    if payer_id not in state.merchant_history:
        state.merchant_history[payer_id] = {}
    state.merchant_history[payer_id][payee_id] = prior_count + 1

    if prior_count == 0 and amount > 2000:
        return 80, NEW_MERCHANT_HIGH_AMT
    if prior_count == 0:
        return 40, NEW_MERCHANT
    return 0, SAFE


# ──────────────────────────────────────────────────────
# SIGNAL LAYER 3 — DEVICE ENTROPY
# ──────────────────────────────────────────────────────
def _device_entropy(payer_id: str, device_id: str, payee_id: str) -> Tuple[int, str]:
    """Is this a new device? Combined with new payee?"""
    last_device = state.device_history.get(payer_id)
    is_new_device = last_device is not None and last_device != device_id

    # Check if payee is new (check BEFORE the merchant_trust update, but
    # merchant_trust already incremented it. We check count <= 1 meaning first time.)
    payee_count = state.merchant_history.get(payer_id, {}).get(payee_id, 0)
    is_new_payee = payee_count <= 1  # 1 because merchant_trust already incremented

    # Update device history
    state.device_history[payer_id] = device_id

    if is_new_device and is_new_payee:
        return 85, NEW_DEVICE_NEW_PAYEE
    if is_new_device:
        return 50, NEW_DEVICE
    return 0, SAFE


# ──────────────────────────────────────────────────────
# SIGNAL LAYER 4 — GEO JUMP
# ──────────────────────────────────────────────────────
def _geo_jump(payer_id: str, location: str, ts: datetime) -> Tuple[int, str]:
    """Location changed from last transaction? How fast?"""
    last = state.geo_history.get(payer_id)

    # Update geo history
    state.geo_history[payer_id] = (location, ts)

    if last is None:
        return 0, SAFE

    last_location, last_ts = last
    if last_location == location:
        return 0, SAFE

    time_gap = (ts - last_ts).total_seconds()
    if time_gap < 300:  # < 5 minutes
        return 80, IMPOSSIBLE_GEO_JUMP
    return 30, GEO_CHANGE


# ──────────────────────────────────────────────────────
# SIGNAL LAYER 5 — TIME ANOMALY
# ──────────────────────────────────────────────────────
def _time_anomaly(ts: datetime) -> Tuple[int, str]:
    """Midnight (0-5 AM) or weekend?"""
    hour = ts.hour
    if 0 <= hour < 5:
        return 70, MIDNIGHT_TXN
    if ts.weekday() >= 5:  # Saturday=5, Sunday=6
        return 30, WEEKEND_TXN
    return 0, SAFE


# SIGNAL LAYER 6 - ML ANOMALY
def _ml_anomaly(amount: float, ts: datetime, is_new_device: bool, is_new_payee: bool) -> Tuple[int, str]:
    """Isolation Forest anomaly signal trained on amount, hour, device, and payee features."""
    if ml_model is None:
        return 0, ML_MODEL_UNAVAILABLE

    features = pd.DataFrame([{
        "amount": amount,
        "hour": ts.hour,
        "is_new_device": int(is_new_device),
        "is_new_payee": int(is_new_payee),
    }], columns=FEATURE_COLUMNS)

    prediction = ml_model.predict(features)[0]
    if prediction == -1:
        return 95, ML_ANOMALY
    return 0, SAFE


# ──────────────────────────────────────────────────────
# COMPOSITE SCORER
# ──────────────────────────────────────────────────────
def score_transaction(txn: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run all 5 signal layers, compute weighted risk_score,
    and return the fully enriched transaction dict.
    """
    ts = parse_dt(str(txn["timestamp"]))
    payer_id = txn["payer_id"]
    payee_id = txn["payee_id"]
    amount = float(txn["amount"])
    location = txn.get("location", "Unknown")
    device_id = txn.get("device_id", "UNKNOWN")

    txn_id = txn.get("txn_id") or f"TXN-{uuid.uuid4().hex[:12].upper()}"

    # Capture history flags before rule layers mutate state.
    last_device = state.device_history.get(payer_id)
    prior_payee_count = state.merchant_history.get(payer_id, {}).get(payee_id, 0)
    is_new_device = last_device is not None and last_device != device_id
    is_new_payee = prior_payee_count == 0

    # Run each layer
    vel_score, vel_reason = _velocity(payer_id, amount, ts)
    mer_score, mer_reason = _merchant_trust(payer_id, payee_id, amount)
    dev_score, dev_reason = _device_entropy(payer_id, device_id, payee_id)
    geo_score, geo_reason = _geo_jump(payer_id, location, ts)
    tim_score, tim_reason = _time_anomaly(ts)
    ml_score, ml_reason = _ml_anomaly(amount, ts, is_new_device, is_new_payee)

    w = state.weights

    signals = [
        {"name": "VELOCITY", "sub_score": vel_score, "reason": vel_reason, "weight": w["velocity"]},
        {"name": "MERCHANT_TRUST", "sub_score": mer_score, "reason": mer_reason, "weight": w["merchant_trust"]},
        {"name": "DEVICE_ENTROPY", "sub_score": dev_score, "reason": dev_reason, "weight": w["device_entropy"]},
        {"name": "GEO_JUMP", "sub_score": geo_score, "reason": geo_reason, "weight": w["geo_jump"]},
        {"name": "TIME_ANOMALY", "sub_score": tim_score, "reason": tim_reason, "weight": w["time_anomaly"]},
        {"name": "ML_ANOMALY", "sub_score": ml_score, "reason": ml_reason, "weight": w["ml_anomaly"]},
    ]

    raw_score = sum(s["sub_score"] * s["weight"] for s in signals)
    final_score = int(min(max(round(raw_score), 0), 100))

    # Top reasons (non-SAFE, sorted by sub_score descending)
    fired = [s for s in signals if s["reason"] not in (SAFE, ML_MODEL_UNAVAILABLE)]
    fired.sort(key=lambda s: s["sub_score"], reverse=True)
    top_reasons = [s["reason"] for s in fired]

    result = {
        "txn_id": txn_id,
        "payer_id": payer_id,
        "payee_id": payee_id,
        "amount": amount,
        "timestamp": str(ts.isoformat()),
        "location": location,
        "device_id": device_id,
        "risk_score": final_score,
        "risk_tier": risk_tier(final_score),
        "signals": signals,
        "top_reasons": top_reasons,
        "verdict": "",  # filled by verdict.py after graph check
    }

    return result


def rescore_all():
    """Re-evaluate every stored transaction with current weights.
    Resets all tracking state and replays in order."""
    raw_txns = [
        {
            "txn_id": t["txn_id"],
            "payer_id": t["payer_id"],
            "payee_id": t["payee_id"],
            "amount": t["amount"],
            "timestamp": t["timestamp"],
            "location": t["location"],
            "device_id": t["device_id"],
        }
        for t in state.transactions
    ]

    # Clear all tracking state
    state.transactions.clear()
    state.velocity_log.clear()
    state.merchant_history.clear()
    state.device_history.clear()
    state.geo_history.clear()
    state.graph_nodes.clear()

    # Re-import to avoid circular dependency at module level
    from graph import process_graph
    from verdict import generate_verdict

    # Replay oldest-first
    for txn in reversed(raw_txns):
        scored = score_transaction(txn)
        scored = process_graph(scored)
        scored["verdict"] = generate_verdict(scored, scored["signals"])
        state.transactions.insert(0, scored)
