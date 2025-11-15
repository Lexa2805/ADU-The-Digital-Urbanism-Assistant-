# backend/app/services/supabase_client.py
from supabase import create_client, Client
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from datetime import datetime, timedelta
from app.services.prioritization import FLOW_LEGAL_DEADLINES_DAYS

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def create_request_for_user(user_id: str, flow_type: str) -> dict:
    """
    Creează o cerere nouă în tabela `requests` cu termen legal calculat.
    """
    submitted_at = datetime.utcnow()
    days = FLOW_LEGAL_DEADLINES_DAYS.get(flow_type, 30)
    legal_due_date = submitted_at + timedelta(days=days)

    res = supabase.table("requests").insert(
        {
            "user_id": user_id,
            "flow_type": flow_type,
            "status": "pending",
            "submitted_at": submitted_at.isoformat(),
            "legal_due_date": legal_due_date.isoformat(),
            # priority_score îl poți seta ulterior, după recalculare
        }
    ).execute()

    return res.data[0]