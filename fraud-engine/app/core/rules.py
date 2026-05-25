import redis
import logging
from datetime import datetime, time
from typing import List, Tuple
from app.schemas.transaction import TransactionRequest
from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback local stores if Redis is unavailable
MOCK_KNOWN_DEVICES = {}
MOCK_KNOWN_PAYEES = {}
MOCK_KNOWN_LOCATIONS = {}
MOCK_VELOCITY_STORE = {}

class RulesEngine:
    def __init__(self):
        self.redis_client = None
        try:
            self.redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.redis_client.ping()
            logger.info("✅ RulesEngine successfully connected to Redis")
        except Exception as e:
            logger.warning(f"⚠️ RulesEngine running with in-memory fallbacks (Redis error: {e})")
            self.redis_client = None

    def evaluate(self, txn: TransactionRequest) -> Tuple[int, List[str]]:
        score = 0
        reasons = []

        # Rule 1: High Amount Rule (+30)
        if txn.amount > 10000:
            score += 30
            reasons.append("High transaction amount (> ₹10,000)")

        # Rule 2: Midnight Rule (+20)
        tx_time = txn.timestamp.time() if isinstance(txn.timestamp, datetime) else datetime.fromisoformat(str(txn.timestamp)).time()
        if time(0, 0) <= tx_time <= time(4, 0):
            score += 20
            reasons.append("Midnight transaction (12 AM - 4 AM)")

        # Rule 3: Velocity Rule (+40)
        # Checking if more than 5 transactions in last 1 minute
        if self._check_velocity_violation(txn.payer_id):
            score += 40
            reasons.append("Velocity alert (more than 5 transactions in 1 minute)")

        # Rule 4: New Device Rule (+25)
        if self._is_new_device(txn.payer_id, txn.device_id):
            score += 25
            reasons.append("New device detected")

        # Rule 5: New Beneficiary Rule (+25)
        if self._is_new_payee(txn.payer_id, txn.payee_id):
            score += 25
            reasons.append("New beneficiary payee")

        # Rule 6: Unusual Location Rule (+20)
        if self._is_new_location(txn.payer_id, txn.location):
            score += 20
            reasons.append("Unusual location compared to transaction history")

        # Cap final score at 100
        final_score = min(score, 100)

        # After evaluating, we save history to train rules
        self._record_history(txn)

        return final_score, reasons

    def _check_velocity_violation(self, payer_id: str) -> bool:
        now_ts = datetime.utcnow().timestamp()
        window_start = now_ts - 60  # 1 minute sliding window

        if self.redis_client:
            try:
                key = f"tx_velocity:{payer_id}"
                # Add current transaction time
                self.redis_client.zadd(key, {str(now_ts): now_ts})
                # Remove transactions older than 1 minute
                self.redis_client.zremrangebyscore(key, "-inf", window_start)
                # Count remaining transactions in the last minute
                count = self.redis_client.zcard(key)
                # Set key expiry to save memory
                self.redis_client.expire(key, 120)
                return count > 5
            except Exception as e:
                logger.error(f"Redis velocity check error: {e}")

        # In-memory fallback
        if payer_id not in MOCK_VELOCITY_STORE:
            MOCK_VELOCITY_STORE[payer_id] = []
        
        # Filter timestamps older than 60s
        MOCK_VELOCITY_STORE[payer_id] = [t for t in MOCK_VELOCITY_STORE[payer_id] if t >= window_start]
        MOCK_VELOCITY_STORE[payer_id].append(now_ts)
        return len(MOCK_VELOCITY_STORE[payer_id]) > 5

    def _is_new_device(self, payer_id: str, device_id: str) -> bool:
        if self.redis_client:
            try:
                key = f"known_devices:{payer_id}"
                # If set is empty, we consider it a new user, but let's see if device exists
                is_known = self.redis_client.sismember(key, device_id)
                if not is_known:
                    # Check if set is empty
                    size = self.redis_client.scard(key)
                    if size == 0:
                        # Empty set means first transaction, let's learn it and return false (or true based on logic)
                        # Let's say if it's the very first device, we don't flag it as "new device" to prevent initial false positives
                        return False
                    return True
                return False
            except Exception as e:
                logger.error(f"Redis device lookup error: {e}")

        # In-memory fallback
        if payer_id not in MOCK_KNOWN_DEVICES:
            MOCK_KNOWN_DEVICES[payer_id] = set()
            return False
        return device_id not in MOCK_KNOWN_DEVICES[payer_id]

    def _is_new_payee(self, payer_id: str, payee_id: str) -> bool:
        if self.redis_client:
            try:
                key = f"known_payees:{payer_id}"
                is_known = self.redis_client.sismember(key, payee_id)
                if not is_known:
                    size = self.redis_client.scard(key)
                    if size == 0:
                        return False
                    return True
                return False
            except Exception as e:
                logger.error(f"Redis payee lookup error: {e}")

        if payer_id not in MOCK_KNOWN_PAYEES:
            MOCK_KNOWN_PAYEES[payer_id] = set()
            return False
        return payee_id not in MOCK_KNOWN_PAYEES[payer_id]

    def _is_new_location(self, payer_id: str, location: str) -> bool:
        if self.redis_client:
            try:
                key = f"known_locations:{payer_id}"
                is_known = self.redis_client.sismember(key, location)
                if not is_known:
                    size = self.redis_client.scard(key)
                    if size == 0:
                        return False
                    return True
                return False
            except Exception as e:
                logger.error(f"Redis location lookup error: {e}")

        if payer_id not in MOCK_KNOWN_LOCATIONS:
            MOCK_KNOWN_LOCATIONS[payer_id] = set()
            return False
        return location not in MOCK_KNOWN_LOCATIONS[payer_id]

    def _record_history(self, txn: TransactionRequest):
        if self.redis_client:
            try:
                self.redis_client.sadd(f"known_devices:{txn.payer_id}", txn.device_id)
                self.redis_client.sadd(f"known_payees:{txn.payer_id}", txn.payee_id)
                self.redis_client.sadd(f"known_locations:{txn.payer_id}", txn.location)
                # Keep these sets alive for 30 days
                self.redis_client.expire(f"known_devices:{txn.payer_id}", 30 * 86400)
                self.redis_client.expire(f"known_payees:{txn.payer_id}", 30 * 86400)
                self.redis_client.expire(f"known_locations:{txn.payer_id}", 30 * 86400)
            except Exception as e:
                logger.error(f"Redis history save error: {e}")
            return

        # In-memory update
        if txn.payer_id not in MOCK_KNOWN_DEVICES:
            MOCK_KNOWN_DEVICES[txn.payer_id] = set()
        MOCK_KNOWN_DEVICES[txn.payer_id].add(txn.device_id)

        if txn.payer_id not in MOCK_KNOWN_PAYEES:
            MOCK_KNOWN_PAYEES[txn.payer_id] = set()
        MOCK_KNOWN_PAYEES[txn.payer_id].add(txn.payee_id)

        if txn.payer_id not in MOCK_KNOWN_LOCATIONS:
            MOCK_KNOWN_LOCATIONS[txn.payer_id] = set()
        MOCK_KNOWN_LOCATIONS[txn.payer_id].add(txn.location)
