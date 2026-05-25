"""
main.py — FastAPI application for the Fiserv UPI Fraud Detector.

All endpoints, CORS configuration, seed data loading, and CSV import/export.
Run with:  uvicorn main:app --reload --port 8000
"""

import csv
import io
from typing import List, Dict, Any

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import state
from engine import score_transaction, rescore_all
from graph import process_graph, get_graph_data
from verdict import generate_verdict

# ──────────────────────────────────────────────────────
# APP SETUP
# ──────────────────────────────────────────────────────
app = FastAPI(
    title="Fiserv UPI Fraud Detector",
    description="Real-time rule-based UPI transaction fraud scoring engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ──────────────────────────────────────────────────────
class TransactionInput(BaseModel):
    payer_id: str
    payee_id: str
    amount: float
    timestamp: str
    location: str
    device_id: str


class WeightsInput(BaseModel):
    velocity: float
    merchant_trust: float
    device_entropy: float
    geo_jump: float
    time_anomaly: float
    ml_anomaly: float


# ──────────────────────────────────────────────────────
# HELPER — process a single transaction through the pipeline
# ──────────────────────────────────────────────────────
def _pipeline(txn_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Score → Graph check → Verdict → Store."""
    scored = score_transaction(txn_dict)
    scored = process_graph(scored)
    scored["verdict"] = generate_verdict(scored, scored["signals"])
    state.transactions.insert(0, scored)
    return scored


# ──────────────────────────────────────────────────────
# SEED DATA — run on startup
# ──────────────────────────────────────────────────────
@app.on_event("startup")
def load_seeds():
    """Process seed transactions to populate initial state."""
    for txn in state.SEED_TRANSACTIONS:
        _pipeline(dict(txn))
    print(f"[OK] Loaded {len(state.SEED_TRANSACTIONS)} seed transactions")


# ──────────────────────────────────────────────────────
# ROUTES
# ──────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "OK", "service": "Fiserv UPI Fraud Detector"}


# --- Single transaction ---
@app.post("/api/transaction")
def evaluate_transaction(txn: TransactionInput):
    result = _pipeline(txn.model_dump())
    return result


# --- Bulk transactions ---
@app.post("/api/transactions/bulk")
async def bulk_evaluate(transactions: List[TransactionInput]):
    results = []
    for txn in transactions:
        result = _pipeline(txn.model_dump())
        results.append(result)
    return results


# --- Get all scored transactions ---
@app.get("/api/transactions")
def get_transactions():
    return state.transactions


# --- Graph data ---
@app.get("/api/graph")
def get_graph():
    return get_graph_data()


# --- Stats ---
@app.get("/api/stats")
def get_stats():
    total = len(state.transactions)
    flagged = sum(1 for t in state.transactions if t["risk_tier"] in ("HIGH", "CRITICAL"))
    critical = sum(1 for t in state.transactions if t["risk_tier"] == "CRITICAL")

    # Count reason code frequency
    reason_counts: Dict[str, int] = {}
    for t in state.transactions:
        for r in t["top_reasons"]:
            reason_counts[r] = reason_counts.get(r, 0) + 1

    top_rules = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "total": total,
        "flagged_count": flagged,
        "critical_count": critical,
        "top_rules": [{"rule": r, "count": c} for r, c in top_rules],
    }


# --- Weights config ---
@app.get("/api/config/weights")
def get_weights():
    return state.weights


@app.post("/api/config/weights")
def set_weights(w: WeightsInput):
    total = w.velocity + w.merchant_trust + w.device_entropy + w.geo_jump + w.time_anomaly + w.ml_anomaly
    if total == 0:
        total = 1.0

    state.weights["velocity"] = round(w.velocity / total, 4)
    state.weights["merchant_trust"] = round(w.merchant_trust / total, 4)
    state.weights["device_entropy"] = round(w.device_entropy / total, 4)
    state.weights["geo_jump"] = round(w.geo_jump / total, 4)
    state.weights["time_anomaly"] = round(w.time_anomaly / total, 4)
    state.weights["ml_anomaly"] = round(w.ml_anomaly / total, 4)

    rescore_all()

    return {"weights": state.weights, "message": "Weights updated and all transactions rescored."}


# --- CSV Upload ---
@app.post("/api/upload/csv")
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    results = []
    for row in reader:
        txn = {
            "payer_id": row.get("payer_id", "").strip(),
            "payee_id": row.get("payee_id", "").strip(),
            "amount": float(row.get("amount", 0)),
            "timestamp": row.get("timestamp", "").strip(),
            "location": row.get("location", "").strip(),
            "device_id": row.get("device_id", "").strip(),
        }
        result = _pipeline(txn)
        results.append(result)

    return results


# --- CSV Export (flagged transactions) ---
@app.get("/api/export/csv")
def export_csv():
    flagged = [t for t in state.transactions if t["risk_tier"] in ("HIGH", "CRITICAL")]

    output = io.StringIO()
    fieldnames = [
        "txn_id", "payer_id", "payee_id", "amount", "timestamp",
        "location", "device_id", "risk_score", "risk_tier", "top_reasons", "verdict",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for t in flagged:
        row = {**t, "top_reasons": "; ".join(t.get("top_reasons", []))}
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=flagged_transactions.csv"},
    )
