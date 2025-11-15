from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from app.services.supabase_client import supabase
from app.services.prioritization import Application, prioritize_applications
from app.middleware.clerk_auth import get_current_user  # << Clerk auth

router = APIRouter(prefix="/clerk", tags=["clerk"])
