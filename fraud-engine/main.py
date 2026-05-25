import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.schemas.transaction import TransactionRequest, EvaluationResponse
from app.services.evaluator import evaluate_transaction
from app.core.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="UPI Fraud Detection Engine",
    description="Microservice running weighted risk assessment rules on live UPI transactions",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/fraud/evaluate", response_model=EvaluationResponse)
def evaluate(transaction: TransactionRequest):
    try:
        logger.info(f"Received transaction for evaluation: {transaction.txn_id}")
        result = evaluate_transaction(transaction)
        logger.info(f"Evaluation complete for {transaction.txn_id}: score={result.risk_score}, status={result.status}")
        return result
    except Exception as e:
        logger.error(f"Error evaluating transaction: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal rules processing error")

@app.get("/health")
def health():
    return {"status": "OK", "service": "Fraud Engine"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=(settings.ENV == "development"))
