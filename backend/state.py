"""
state.py — All in-memory stores for the Fiserv UPI Fraud Detector.
No external database. Everything lives in Python dicts/lists.
"""

from datetime import datetime
from typing import Dict, List, Set, Any

# ──────────────────────────────────────────────────────
# CONFIGURATION — signal weights (mutable via API)
# ──────────────────────────────────────────────────────
weights: Dict[str, float] = {
    "velocity": 0.30,
    "merchant_trust": 0.25,
    "device_entropy": 0.20,
    "geo_jump": 0.15,
    "time_anomaly": 0.10,
}

# ──────────────────────────────────────────────────────
# TRANSACTION LOG — every scored transaction (latest first)
# ──────────────────────────────────────────────────────
transactions: List[Dict[str, Any]] = []

# ──────────────────────────────────────────────────────
# VELOCITY STORE — payer_id → list of (timestamp, amount)
# ──────────────────────────────────────────────────────
velocity_log: Dict[str, List[tuple]] = {}

# ──────────────────────────────────────────────────────
# MERCHANT TRUST — payer_id → { payee_id: count }
# ──────────────────────────────────────────────────────
merchant_history: Dict[str, Dict[str, int]] = {}

# ──────────────────────────────────────────────────────
# DEVICE ENTROPY — payer_id → last known device_id
# ──────────────────────────────────────────────────────
device_history: Dict[str, str] = {}

# ──────────────────────────────────────────────────────
# GEO TRACKING — payer_id → (last_location, last_timestamp)
# ──────────────────────────────────────────────────────
geo_history: Dict[str, tuple] = {}

# ──────────────────────────────────────────────────────
# FRAUD RING GRAPH — node_id → node data
# ──────────────────────────────────────────────────────
graph_nodes: Dict[str, Dict[str, Any]] = {}
# node structure: {"type": "payer"|"payee"|"device", "flagged": bool, "links": set()}

# ──────────────────────────────────────────────────────
# SEED DATA — 10 transactions exercising all 5 rule paths
# ──────────────────────────────────────────────────────
SEED_TRANSACTIONS = [
    # 1. Clean, safe daytime transaction — LOW risk
    {
        "payer_id": "USER_ALICE",
        "payee_id": "MERCHANT_GROCERY",
        "amount": 450,
        "timestamp": "2026-05-25T14:30:00",
        "location": "Mumbai",
        "device_id": "DEV_ALICE_PHONE",
    },
    # 2. Same user, same merchant, still safe — LOW risk
    {
        "payer_id": "USER_ALICE",
        "payee_id": "MERCHANT_GROCERY",
        "amount": 800,
        "timestamp": "2026-05-25T14:31:00",
        "location": "Mumbai",
        "device_id": "DEV_ALICE_PHONE",
    },
    # 3. New merchant with high amount — triggers MERCHANT_TRUST
    {
        "payer_id": "USER_ALICE",
        "payee_id": "MERCHANT_ELECTRONICS",
        "amount": 5500,
        "timestamp": "2026-05-25T14:32:00",
        "location": "Mumbai",
        "device_id": "DEV_ALICE_PHONE",
    },
    # 4. Velocity burst — many txns in 60s — triggers VELOCITY
    {
        "payer_id": "USER_BOB",
        "payee_id": "MERCHANT_GAMING",
        "amount": 6000,
        "timestamp": "2026-05-25T15:00:00",
        "location": "Delhi",
        "device_id": "DEV_BOB_TAB",
    },
    # 5. Bob sends again quickly — velocity accumulates
    {
        "payer_id": "USER_BOB",
        "payee_id": "MERCHANT_CRYPTO",
        "amount": 5500,
        "timestamp": "2026-05-25T15:00:30",
        "location": "Delhi",
        "device_id": "DEV_BOB_TAB",
    },
    # 6. Midnight transaction from new device — triggers TIME_ANOMALY + DEVICE_ENTROPY
    {
        "payer_id": "USER_CHARLIE",
        "payee_id": "MERCHANT_ATM",
        "amount": 3000,
        "timestamp": "2026-05-25T02:14:00",
        "location": "Pune",
        "device_id": "DEV_CHARLIE_OLD",
    },
    # 7. Charlie again, new device + new merchant at midnight — CRITICAL
    {
        "payer_id": "USER_CHARLIE",
        "payee_id": "MERCHANT_UNKNOWN",
        "amount": 9500,
        "timestamp": "2026-05-25T02:15:00",
        "location": "Pune",
        "device_id": "DEV_CHARLIE_NEW",
    },
    # 8. Geo jump — location changes impossibly fast
    {
        "payer_id": "USER_DAVE",
        "payee_id": "MERCHANT_FUEL",
        "amount": 2200,
        "timestamp": "2026-05-25T11:00:00",
        "location": "Bengaluru",
        "device_id": "DEV_DAVE_PHONE",
    },
    # 9. Dave jumps to Kolkata within 2 minutes — GEO_JUMP
    {
        "payer_id": "USER_DAVE",
        "payee_id": "MERCHANT_FUEL",
        "amount": 1800,
        "timestamp": "2026-05-25T11:02:00",
        "location": "Kolkata",
        "device_id": "DEV_DAVE_PHONE",
    },
    # 10. Weekend transaction — triggers TIME_ANOMALY (weekend) + NEW_MERCHANT
    {
        "payer_id": "USER_EVE",
        "payee_id": "MERCHANT_LUXURY",
        "amount": 15000,
        "timestamp": "2026-05-24T10:30:00",  # Saturday
        "location": "Chennai",
        "device_id": "DEV_EVE_IPAD",
    },
]


def reset_stores():
    """Clear all in-memory state (useful for testing)."""
    global transactions
    transactions.clear()
    velocity_log.clear()
    merchant_history.clear()
    device_history.clear()
    geo_history.clear()
    graph_nodes.clear()
