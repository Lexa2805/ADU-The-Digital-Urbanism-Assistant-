from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional


# Termene legale (în zile) – completează cu valorile reale
FLOW_LEGAL_DEADLINES_DAYS: Dict[str, int] = {
    "certificat_urbanism": 30,
    "autorizatie_constructie_locuinta": 60,
    "autorizatie_demolare": 30,
    "aviz_preliminar": 15,
}


@dataclass
class Application:
    id: str
    flow_type: str
    submitted_at: datetime
    legal_due_date: Optional[datetime] = None
    status: str = "pending"


def compute_legal_due_date(app: Application) -> datetime:
    """Calculează data limită legală pentru o cerere."""
    days = FLOW_LEGAL_DEADLINES_DAYS.get(app.flow_type, 30)
    if app.legal_due_date is not None:
        return app.legal_due_date
    return app.submitted_at + timedelta(days=days)


def compute_priority(app: Application, backlog_in_category: int, now: datetime) -> Dict:
    """Calculează scorul de prioritate pentru o cerere."""
    legal_due = compute_legal_due_date(app)
    days_left = (legal_due - now).days

    # cu cât sunt mai puține zile rămase, cu atât e mai urgent
    urgency_score = max(0, 90 - max(days_left, 0))
    backlog_score = backlog_in_category

    total_score = urgency_score * 2 + backlog_score  # poți ajusta ponderile

    return {
        "id": app.id,
        "flow_type": app.flow_type,
        "submitted_at": app.submitted_at,
        "legal_due_date": legal_due,
        "days_left": days_left,
        "backlog_in_category": backlog_in_category,
        "priority_score": total_score,
    }


def prioritize_applications(applications: List[Application]) -> List[Dict]:
    """
    Returnează cererile ordonate după prioritate.

    1) cele mai aproape de termenul legal
    2) categorii cu multe cereri
    3) cele mai vechi cereri
    """
    if not applications:
        return []

    now = datetime.now(timezone.utc)

    # câte cereri sunt pe fiecare categorie
    count_by_flow: Dict[str, int] = {}
    for app in applications:
        count_by_flow[app.flow_type] = count_by_flow.get(app.flow_type, 0) + 1

    enriched: List[Dict] = []
    for app in applications:
        info = compute_priority(
            app,
            backlog_in_category=count_by_flow[app.flow_type],
            now=now,
        )
        info["application"] = app  # dacă vrei să mai folosești obiectul original
        enriched.append(info)

    # sortare
    enriched.sort(
        key=lambda x: (
            x["days_left"],          # 1. cât mai aproape de termen
            -x["priority_score"],    # 2. scor mare
            x["submitted_at"],       # 3. cele mai vechi primele
        )
    )

    return enriched
