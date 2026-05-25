"""
graph.py — Fraud Ring adjacency graph with 2-hop BFS.

Builds an in-memory graph linking payer ↔ payee and payer ↔ device.
On every transaction, runs a 2-hop BFS to detect proximity to flagged nodes.
"""

from collections import deque
from typing import Dict, Any, List

import state
from engine import LINKED_TO_FRAUD_NODE

# ──────────────────────────────────────────────────────
# GRAPH HELPERS
# ──────────────────────────────────────────────────────
def _ensure_node(node_id: str, node_type: str):
    """Create a node if it doesn't exist."""
    if node_id not in state.graph_nodes:
        state.graph_nodes[node_id] = {
            "type": node_type,
            "flagged": False,
            "links": set(),
        }


def _add_edge(a: str, b: str):
    """Add undirected edge between two nodes."""
    state.graph_nodes[a]["links"].add(b)
    state.graph_nodes[b]["links"].add(a)


def _bfs_has_flagged_neighbour(start: str, max_hops: int = 2) -> bool:
    """BFS up to max_hops — returns True if any visited node (excluding start) is flagged."""
    visited = {start}
    queue = deque([(start, 0)])

    while queue:
        current, depth = queue.popleft()
        if depth >= max_hops:
            continue

        for neighbor in state.graph_nodes.get(current, {}).get("links", set()):
            if neighbor not in visited:
                visited.add(neighbor)
                if state.graph_nodes.get(neighbor, {}).get("flagged", False):
                    return True
                queue.append((neighbor, depth + 1))

    return False


# ──────────────────────────────────────────────────────
# PROCESS GRAPH — called on every transaction
# ──────────────────────────────────────────────────────
def process_graph(txn: Dict[str, Any]) -> Dict[str, Any]:
    """
    1. Add nodes and edges for this transaction.
    2. If risk_score >= 70, flag the payer node.
    3. Run 2-hop BFS — if a flagged neighbour is found, boost score by +20.
    """
    payer_id = txn["payer_id"]
    payee_id = txn["payee_id"]
    device_id = txn["device_id"]

    # Ensure nodes exist
    _ensure_node(payer_id, "payer")
    _ensure_node(payee_id, "payee")
    _ensure_node(device_id, "device")

    # Add edges
    _add_edge(payer_id, payee_id)
    _add_edge(payer_id, device_id)

    # Flag payer if risk is high
    if txn["risk_score"] >= 70:
        state.graph_nodes[payer_id]["flagged"] = True

    # 2-hop BFS check
    if _bfs_has_flagged_neighbour(payer_id, max_hops=2):
        boosted = min(txn["risk_score"] + 20, 100)
        txn["risk_score"] = boosted
        # Recalculate tier with boosted score
        from engine import risk_tier
        txn["risk_tier"] = risk_tier(boosted)

        if LINKED_TO_FRAUD_NODE not in txn["top_reasons"]:
            txn["top_reasons"].append(LINKED_TO_FRAUD_NODE)

        # Add to signals for the breakdown
        txn["signals"].append({
            "name": "FRAUD_RING",
            "sub_score": 20,
            "reason": LINKED_TO_FRAUD_NODE,
            "weight": 1.0,
        })

    return txn


# ──────────────────────────────────────────────────────
# EXPORT GRAPH — for D3 visualisation
# ──────────────────────────────────────────────────────
def get_graph_data() -> Dict[str, List]:
    """Return nodes and edges for the frontend D3 force-directed graph."""
    nodes = []
    edges_set = set()

    for node_id, data in state.graph_nodes.items():
        nodes.append({
            "id": node_id,
            "type": data["type"],
            "flagged": data["flagged"],
        })
        for linked in data["links"]:
            edge = tuple(sorted([node_id, linked]))
            edges_set.add(edge)

    edges = [{"source": e[0], "target": e[1]} for e in edges_set]

    return {"nodes": nodes, "edges": edges}
