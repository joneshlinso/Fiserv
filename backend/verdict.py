"""
verdict.py — Template-based natural language verdict generator.
No AI, no API calls — pure string formatting.
"""

from typing import Dict, List, Any
from dateutil.parser import parse as parse_dt

from engine import (
    BURST_VELOCITY,
    HIGH_VELOCITY,
    NEW_MERCHANT_HIGH_AMT,
    NEW_MERCHANT,
    NEW_DEVICE_NEW_PAYEE,
    NEW_DEVICE,
    IMPOSSIBLE_GEO_JUMP,
    GEO_CHANGE,
    MIDNIGHT_TXN,
    WEEKEND_TXN,
    LINKED_TO_FRAUD_NODE,
    SAFE,
)

# ──────────────────────────────────────────────────────
# REASON → ENGLISH CLAUSE MAPPING
# ──────────────────────────────────────────────────────
def _clause(reason: str, txn: Dict[str, Any]) -> str:
    """Map a reason code to a grammatically correct English clause."""
    amount = txn.get("amount", 0)
    ts = parse_dt(str(txn.get("timestamp", "")))
    # Cross-platform hour formatting (%-I is Linux-only, %#I is Windows-only)
    raw_hour = ts.hour % 12 or 12
    minute = f"{ts.minute:02d}"
    ampm = "am" if ts.hour < 12 else "pm"

    mapping = {
        BURST_VELOCITY: f"₹{amount:,.0f} burst sent within 60 seconds",
        HIGH_VELOCITY: f"₹{amount:,.0f} rapid transfer detected in the velocity window",
        NEW_MERCHANT_HIGH_AMT: "high-value transfer to an unknown merchant",
        NEW_MERCHANT: "first-time transaction with this merchant",
        NEW_DEVICE_NEW_PAYEE: "new device paired with a new beneficiary",
        NEW_DEVICE: "transaction initiated from an unrecognised device",
        IMPOSSIBLE_GEO_JUMP: "location jumped impossibly fast between transactions",
        GEO_CHANGE: "transaction originated from a different city",
        MIDNIGHT_TXN: f"transaction at {raw_hour}:{minute} {ampm}",
        WEEKEND_TXN: "transaction placed on a weekend",
        LINKED_TO_FRAUD_NODE: "account linked to a previously flagged node",
    }

    return mapping.get(reason, reason.lower().replace("_", " "))


# ──────────────────────────────────────────────────────
# VERDICT GENERATOR
# ──────────────────────────────────────────────────────
def generate_verdict(txn: Dict[str, Any], signals: List[Dict[str, Any]]) -> str:
    """
    Generate a human-readable verdict sentence.
    Takes top 2 fired signals by sub_score and builds a sentence.
    """
    # Filter non-safe signals and sort by sub_score descending
    fired = [s for s in signals if s["reason"] != SAFE]
    fired.sort(key=lambda s: s["sub_score"], reverse=True)

    if not fired:
        return "Safe: no suspicious signals detected."

    # Take top 2
    top = fired[:2]
    clauses = [_clause(s["reason"], txn) for s in top]

    if len(clauses) == 1:
        return f"Flagged: {clauses[0]}."
    return f"Flagged: {clauses[0]} and {clauses[1]}."
