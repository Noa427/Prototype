from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from datetime import timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from .database import engine, get_session, create_db_and_tables
from .models import User, Deal, Agency
from .auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_password_hash
)
from .scheduler import start_scheduler, shutdown_scheduler, run_all_scrapers
from .services.rental_yield import update_all_yields
from .services.scoring import update_all_scores_deepseek
from .api.trends import router as trends_router
from .api.deals import router as deals_router
from .api.leads import router as leads_router
from .api.admin import router as admin_router
from .api.alerts import router as alerts_router
from .api.documents import router as documents_router
from .api.chat import router as chat_router
from .api.license import router as license_router
from .api.calendar_config import router as calendar_router
from .api.matching import router as matching_router
from .api.onboarding import router as onboarding_router
from .api.notifications import router as notifications_router
from .api.campaigns import router as campaigns_router
from .api.chat_public import router as chat_public_router
from .models import Alert

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="AEVUM API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — origines restreintes via .env
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    """Injecte tenant_id (agency_id) dans request.state depuis le JWT cookie."""
    from jose import jwt as _jwt, JWTError
    token = request.cookies.get("access_token")
    request.state.tenant_id = None
    if token:
        try:
            payload = _jwt.decode(token, os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_CHANGE_ME"), algorithms=["HS256"])
            request.state.tenant_id = payload.get("agency_id")
        except JWTError:
            pass
    return await call_next(request)

app.include_router(trends_router, prefix="/api")
app.include_router(deals_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(license_router, prefix="/api")
app.include_router(calendar_router, prefix="/api")
app.include_router(matching_router, prefix="/api")
app.include_router(onboarding_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(campaigns_router, prefix="/api")
app.include_router(chat_public_router, prefix="/api")

# Fichiers statiques (chat-widget.js, etc.)
_static_dir = Path(__file__).parent / "static"
_static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    start_scheduler()

@app.on_event("shutdown")
def on_shutdown():
    shutdown_scheduler()

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/auth/login")
@limiter.limit("5/15minutes")
async def login_for_access_token(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    user = authenticate_user(session, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "agency_id": user.agency_id},
        expires_delta=access_token_expires
    )

    is_prod = os.getenv("ENV", "dev") == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return {
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "fullName": user.full_name,
            "role": user.role
        }
    }


@app.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}

@app.get("/auth/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Les routes /deals et /alerts sont maintenant dans backend/api/deals.py et backend/api/leads.py (ou alerts.py)
# Pour l'instant, je garde /alerts ici si je n'ai pas créé alerts.py, mais je devrais le faire.
# Le user a demandé de modifier /deals, /leads, /alerts.

@app.post("/admin/run_scrapers")
async def trigger_scrapers(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can trigger scrapers"
        )
    
    # Trigger in a separate thread to not block FastAPI
    import threading
    thread = threading.Thread(target=run_all_scrapers)
    thread.start()
    
    return {"message": "Scrapers triggered in background"}

@app.post("/admin/update_yields")
async def trigger_update_yields(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    count = update_all_yields(session)
    return {"message": f"Updated yields for {count} deals"}
    
from pydantic import BaseModel

class UserPreferencesUpdate(BaseModel):
    alert_threshold: Optional[int] = None

@app.patch("/users/me/preferences")
async def update_user_preferences(
    update: UserPreferencesUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if update.alert_threshold is not None:
        current_user.alert_threshold = update.alert_threshold
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user
