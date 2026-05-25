# Fiserv UPI Real-Time Fraud Detector

Real-time rule-based fraud detection system for UPI transactions.  
Built for the Fiserv Hackathon — 5-signal composite scoring engine with fraud ring detection.

## 🚀 Quick Start (3 commands)

### 1. Start Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Open Dashboard
```
http://localhost:5173
```

---

## 🏗️ Architecture

```
UPI Transaction ──→ FastAPI ──→ 5-Signal Engine ──→ Fraud Ring BFS ──→ NL Verdict
                       │              │                    │               │
                       ▼              ▼                    ▼               ▼
                  REST API    Velocity / Merchant   Graph Adjacency   "Flagged: burst
                  CORS-enabled  Device / Geo / Time    2-hop BFS      velocity and
                                                                      new device."
```

**Stack**: Python FastAPI backend · React + Vite + Tailwind frontend · D3.js graph · In-memory state

## 📊 Signal Layers

| # | Signal | Weight | Checks |
|---|--------|--------|--------|
| 1 | VELOCITY | 30% | ₹ sent in last 60 seconds |
| 2 | MERCHANT_TRUST | 25% | Prior transactions with payee |
| 3 | DEVICE_ENTROPY | 20% | New device, combined with new payee |
| 4 | GEO_JUMP | 15% | Location change speed |
| 5 | TIME_ANOMALY | 10% | Midnight (0–5 AM) or weekend |

**Tiers**: 0–39 LOW · 40–69 MEDIUM · 70–89 HIGH · 90–100 CRITICAL

## 🖥️ Frontend Tabs

1. **Dashboard** — Live transaction feed with colour-coded tiers, click-to-drill-down
2. **Simulator** — Manual form + 3 presets + CSV upload/download
3. **Rule Tuner** — 5 weight sliders with live rescore preview
4. **Fraud Ring** — D3 force-directed graph with flagged node detection
5. **Architecture** — Production scale-out diagram
