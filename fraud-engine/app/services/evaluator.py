from app.core.rules import RulesEngine
from app.schemas.transaction import TransactionRequest, EvaluationResponse

rules_engine = RulesEngine()

def evaluate_transaction(txn: TransactionRequest) -> EvaluationResponse:
    risk_score, reasons = rules_engine.evaluate(txn)

    # Risk level classification
    if risk_score <= 30:
        status = "LOW"
    elif risk_score <= 60:
        status = "MEDIUM"
    else:
        status = "HIGH"

    return EvaluationResponse(
        risk_score=risk_score,
        status=status,
        reasons=reasons
    )
