from fastapi import Header, HTTPException
import requests
import os

CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


def get_current_user(authorization: str = Header(None)):
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")

    token = authorization.replace("Bearer ", "")

    resp = requests.get(
        "https://api.clerk.dev/v1/me",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Clerk token")

    return resp.json()
