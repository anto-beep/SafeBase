from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Cookie, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
import bcrypt
import jwt
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
JWT_ALGO = "HS256"

app = FastAPI(title="SafeTradie API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# =================== MODELS ===================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    company_name: Optional[str] = None
    role: Literal["owner", "worker"] = "owner"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str = "owner"
    company_name: Optional[str] = None
    picture: Optional[str] = None
    auth_provider: str = "email"
    created_at: datetime


class WorkerIn(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    trade: Optional[str] = None


class Worker(WorkerIn):
    worker_id: str
    user_id: str
    created_at: datetime


class LicenceIn(BaseModel):
    worker_id: str
    licence_type: str  # white_card, electrical, plumbing, first_aid, high_risk, etc.
    licence_number: str
    issuing_authority: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: str  # ISO date


class Licence(LicenceIn):
    licence_id: str
    user_id: str
    status: str = "active"
    created_at: datetime


class IncidentIn(BaseModel):
    title: str
    description: str
    severity: Literal["near_miss", "minor", "moderate", "serious", "critical"]
    incident_type: str  # injury, near_miss, property_damage, environmental
    location: Optional[str] = None
    site: Optional[str] = None
    occurred_at: Optional[str] = None
    photos: List[str] = []
    workers_involved: List[str] = []
    corrective_actions: Optional[str] = None


class Incident(IncidentIn):
    incident_id: str
    user_id: str
    status: str = "open"  # open, investigating, closed
    notify_regulator: bool = False
    created_at: datetime


class DocumentGenerateIn(BaseModel):
    document_type: Literal["SWMS", "risk_assessment", "emergency_procedure", "induction_checklist", "hazardous_substance_register"]
    trade: str  # plumbing, electrical, roofing, carpentry, etc.
    job_description: str
    site_location: Optional[str] = None
    hazards: List[str] = []
    extra_notes: Optional[str] = None


class DocumentRecord(BaseModel):
    document_id: str
    user_id: str
    document_type: str
    title: str
    trade: str
    job_description: str
    content: str
    created_at: datetime


# =================== AUTH HELPERS ===================
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
) -> User:
    # 1. Try cookie session_token (Emergent Google Auth)
    token = session_token
    bearer = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization.split(" ", 1)[1].strip()

    # Try cookie session first
    if token:
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            expires_at = sess["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
                if user_doc:
                    return User(**user_doc)

    # 2. Try bearer (could be JWT or session_token)
    if bearer:
        # Try as session_token first
        sess = await db.user_sessions.find_one({"session_token": bearer}, {"_id": 0})
        if sess:
            expires_at = sess["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
                if user_doc:
                    return User(**user_doc)
        # Try as JWT
        try:
            payload = jwt.decode(bearer, JWT_SECRET, algorithms=[JWT_ALGO])
            user_doc = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            if user_doc:
                return User(**user_doc)
        except jwt.PyJWTError:
            pass

    raise HTTPException(status_code=401, detail="Not authenticated")


# =================== ROUTES ===================
@api_router.get("/")
async def root():
    return {"service": "SafeTradie API", "status": "ok"}


# ----------- AUTH -----------
@api_router.post("/auth/register")
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": body.email.lower(),
        "name": body.name,
        "role": body.role,
        "company_name": body.company_name,
        "auth_provider": "email",
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = make_jwt(user_id)
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": body.email.lower(),
            "name": body.name,
            "role": body.role,
            "company_name": body.company_name,
            "auth_provider": "email",
        },
    }


@api_router.post("/auth/login")
async def login(body: LoginIn):
    user_doc = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(body.password, user_doc["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_jwt(user_doc["user_id"])
    return {
        "token": token,
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "role": user_doc.get("role", "owner"),
            "company_name": user_doc.get("company_name"),
            "auth_provider": user_doc.get("auth_provider", "email"),
        },
    }


class GoogleSessionIn(BaseModel):
    session_id: str


@api_router.post("/auth/google-session")
async def google_session(body: GoogleSessionIn, response: Response):
    """Process session_id from Emergent Google OAuth callback."""
    async with httpx.AsyncClient() as cli:
        r = await cli.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
            timeout=15.0,
        )
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session")
    data = r.json()
    email = data["email"].lower()
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not user_doc:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", email.split("@")[0]),
            "picture": data.get("picture"),
            "role": "owner",
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one({**user_doc})
    else:
        user_id = user_doc["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"picture": data.get("picture"), "name": data.get("name", user_doc["name"])}},
        )

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return {
        "user": {
            "user_id": user_id,
            "email": email,
            "name": user_doc.get("name"),
            "picture": data.get("picture"),
            "role": user_doc.get("role", "owner"),
            "auth_provider": "google",
        }
    }


@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    data = current_user.model_dump()
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if user_doc:
        data["onboarding_complete"] = user_doc.get("onboarding_complete", False)
    return data


@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"success": True}


# ----------- WORKERS -----------
@api_router.get("/workers")
async def list_workers(current_user: User = Depends(get_current_user)):
    workers = await db.workers.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(500)
    return workers


@api_router.post("/workers")
async def create_worker(body: WorkerIn, current_user: User = Depends(get_current_user)):
    worker_id = f"wrk_{uuid.uuid4().hex[:10]}"
    doc = {
        "worker_id": worker_id,
        "user_id": current_user.user_id,
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workers.insert_one({**doc})
    return doc


@api_router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str, current_user: User = Depends(get_current_user)):
    res = await db.workers.delete_one({"worker_id": worker_id, "user_id": current_user.user_id})
    await db.licences.delete_many({"worker_id": worker_id, "user_id": current_user.user_id})
    return {"deleted": res.deleted_count}


# ----------- LICENCES -----------
@api_router.get("/licences")
async def list_licences(current_user: User = Depends(get_current_user)):
    licences = await db.licences.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(1000)
    now = datetime.now(timezone.utc)
    for lic in licences:
        try:
            exp = datetime.fromisoformat(lic["expiry_date"]).replace(tzinfo=timezone.utc) if "T" not in lic["expiry_date"] else datetime.fromisoformat(lic["expiry_date"])
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            days = (exp - now).days
            if days < 0:
                lic["status"] = "expired"
            elif days <= 30:
                lic["status"] = "expiring_soon"
            else:
                lic["status"] = "active"
            lic["days_until_expiry"] = days
        except Exception:
            lic["status"] = "unknown"
            lic["days_until_expiry"] = None
    return licences


@api_router.post("/licences")
async def create_licence(body: LicenceIn, current_user: User = Depends(get_current_user)):
    licence_id = f"lic_{uuid.uuid4().hex[:10]}"
    doc = {
        "licence_id": licence_id,
        "user_id": current_user.user_id,
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.licences.insert_one({**doc})
    return doc


@api_router.delete("/licences/{licence_id}")
async def delete_licence(licence_id: str, current_user: User = Depends(get_current_user)):
    res = await db.licences.delete_one({"licence_id": licence_id, "user_id": current_user.user_id})
    return {"deleted": res.deleted_count}


# ----------- INCIDENTS -----------
@api_router.get("/incidents")
async def list_incidents(current_user: User = Depends(get_current_user)):
    return await db.incidents.find({"user_id": current_user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.post("/incidents")
async def create_incident(body: IncidentIn, current_user: User = Depends(get_current_user)):
    incident_id = f"inc_{uuid.uuid4().hex[:10]}"
    notify_regulator = body.severity in ("serious", "critical")
    doc = {
        "incident_id": incident_id,
        "user_id": current_user.user_id,
        "status": "open",
        "notify_regulator": notify_regulator,
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.incidents.insert_one({**doc})
    return doc


@api_router.patch("/incidents/{incident_id}")
async def update_incident_status(incident_id: str, body: dict, current_user: User = Depends(get_current_user)):
    allowed = {k: v for k, v in body.items() if k in ("status", "corrective_actions")}
    await db.incidents.update_one(
        {"incident_id": incident_id, "user_id": current_user.user_id},
        {"$set": allowed},
    )
    doc = await db.incidents.find_one({"incident_id": incident_id, "user_id": current_user.user_id}, {"_id": 0})
    return doc


# ----------- DOCUMENTS / AI GENERATION -----------
@api_router.post("/documents/generate")
async def generate_document(body: DocumentGenerateIn, current_user: User = Depends(get_current_user)):
    type_label = body.document_type.replace("_", " ").upper()
    sys_msg = (
        "You are an expert Australian Workplace Health and Safety (WHS) consultant. "
        "You generate compliant, professional safety documents for Australian trade businesses "
        "in plain English, formatted in Markdown with clear headings, bullet lists and tables. "
        "Always include relevant Australian standards (AS/NZS), WHS Act/Regulations references, "
        "and practical hazard controls following the Hierarchy of Controls."
    )
    user_prompt = (
        f"Generate a {type_label} document for the following job:\n\n"
        f"Trade: {body.trade}\n"
        f"Job description: {body.job_description}\n"
        f"Site location: {body.site_location or 'Not specified'}\n"
        f"Identified hazards: {', '.join(body.hazards) if body.hazards else 'Identify typical hazards for this trade.'}\n"
        f"Additional notes: {body.extra_notes or 'None'}\n\n"
        "Structure the document with sections: Document Header (title, version, date, prepared by), "
        "Scope of Work, Hazard Identification (table: hazard | risk | control), "
        "Risk Matrix Assessment (likelihood x consequence), Control Measures (Hierarchy of Controls), "
        "PPE Requirements, Emergency Procedures, Sign-Off block, and Relevant Legislation. "
        "Make it ready for use on an Australian construction site."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"doc_{uuid.uuid4().hex[:8]}",
            system_message=sys_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        # Run LLM call in a thread (with its own event loop) so the FastAPI
        # event loop is not blocked by litellm's synchronous internals.
        def _run_llm():
            return asyncio.run(chat.send_message(UserMessage(text=user_prompt)))

        response = await asyncio.wait_for(asyncio.to_thread(_run_llm), timeout=50.0)
    except asyncio.TimeoutError:
        raise HTTPException(503, "AI provider is slow/unavailable - please retry shortly.")
    except Exception as e:
        logger.exception("AI generation failed")
        raise HTTPException(503, f"AI provider unavailable: {str(e)[:200]}")

    document_id = f"doc_{uuid.uuid4().hex[:10]}"
    title = f"{type_label} - {body.trade.title()} - {body.job_description[:40]}"
    doc = {
        "document_id": document_id,
        "user_id": current_user.user_id,
        "document_type": body.document_type,
        "title": title,
        "trade": body.trade,
        "job_description": body.job_description,
        "site_location": body.site_location,
        "hazards": body.hazards,
        "content": response,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.documents.insert_one({**doc})
    return doc


@api_router.get("/documents")
async def list_documents(current_user: User = Depends(get_current_user)):
    return await db.documents.find({"user_id": current_user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.get("/documents/{document_id}")
async def get_document(document_id: str, current_user: User = Depends(get_current_user)):
    doc = await db.documents.find_one({"document_id": document_id, "user_id": current_user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, current_user: User = Depends(get_current_user)):
    res = await db.documents.delete_one({"document_id": document_id, "user_id": current_user.user_id})
    return {"deleted": res.deleted_count}


# ----------- COMPLIANCE INTELLIGENCE -----------
@api_router.get("/compliance/score")
async def compliance_score(current_user: User = Depends(get_current_user)):
    workers = await db.workers.count_documents({"user_id": current_user.user_id})
    licences_list = await db.licences.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(1000)
    incidents_list = await db.incidents.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(1000)
    documents = await db.documents.count_documents({"user_id": current_user.user_id})

    now = datetime.now(timezone.utc)
    expired = 0
    expiring = 0
    for lic in licences_list:
        try:
            exp = datetime.fromisoformat(lic["expiry_date"])
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            days = (exp - now).days
            if days < 0:
                expired += 1
            elif days <= 30:
                expiring += 1
        except Exception:
            pass

    open_incidents = sum(1 for i in incidents_list if i.get("status") == "open")
    serious_incidents = sum(1 for i in incidents_list if i.get("severity") in ("serious", "critical"))

    # Score: start 100, deduct for issues
    score = 100
    score -= expired * 8
    score -= expiring * 3
    score -= open_incidents * 4
    score -= serious_incidents * 6
    if documents == 0:
        score -= 15
    if workers == 0:
        score -= 10
    score = max(0, min(100, score))

    insights = []
    if expired:
        insights.append(f"{expired} licence(s) have expired - renew immediately to remain compliant.")
    if expiring:
        insights.append(f"{expiring} licence(s) expiring within 30 days.")
    if open_incidents:
        insights.append(f"{open_incidents} incident(s) still open - close investigations promptly.")
    if serious_incidents:
        insights.append(f"{serious_incidents} serious/critical incident(s) recorded - regulatory notification may apply.")
    if documents < 3:
        insights.append("Generate more SWMS and risk assessments for high-risk activities.")
    if not insights:
        insights.append("Compliance posture is strong - keep documenting toolbox talks and inductions.")

    return {
        "score": score,
        "metrics": {
            "workers": workers,
            "licences_total": len(licences_list),
            "licences_expired": expired,
            "licences_expiring_30d": expiring,
            "documents": documents,
            "incidents_total": len(incidents_list),
            "incidents_open": open_incidents,
            "incidents_serious": serious_incidents,
        },
        "insights": insights,
    }


# ----------- SETTINGS / BUSINESS PROFILE -----------
class BusinessProfileIn(BaseModel):
    company_name: Optional[str] = None
    abn: Optional[str] = None
    trade_type: Optional[str] = None
    primary_state: Optional[str] = None
    worker_count_band: Optional[str] = None
    logo_url: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    whs_rep_name: Optional[str] = None


@api_router.get("/settings/business")
async def get_business(current_user: User = Depends(get_current_user)):
    doc = await db.business_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return doc or {"user_id": current_user.user_id}


@api_router.put("/settings/business")
async def update_business(body: BusinessProfileIn, current_user: User = Depends(get_current_user)):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    payload["user_id"] = current_user.user_id
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.business_profiles.update_one(
        {"user_id": current_user.user_id}, {"$set": payload}, upsert=True
    )
    if body.company_name:
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": {"company_name": body.company_name}},
        )
    doc = await db.business_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return doc


# ----------- TEAM / USERS & ROLES -----------
class InviteIn(BaseModel):
    email: EmailStr
    role: Literal["admin", "safety_manager", "supervisor", "worker"]
    name: Optional[str] = None


@api_router.get("/team")
async def list_team(current_user: User = Depends(get_current_user)):
    members = await db.team_members.find({"owner_id": current_user.user_id}, {"_id": 0}).to_list(200)
    return members


@api_router.post("/team/invite")
async def invite_team_member(body: InviteIn, current_user: User = Depends(get_current_user)):
    existing = await db.team_members.find_one(
        {"owner_id": current_user.user_id, "email": body.email.lower()}
    )
    if existing:
        raise HTTPException(400, "Already invited")
    invite_id = f"inv_{uuid.uuid4().hex[:10]}"
    doc = {
        "invite_id": invite_id,
        "owner_id": current_user.user_id,
        "email": body.email.lower(),
        "name": body.name,
        "role": body.role,
        "status": "pending",
        "invited_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.team_members.insert_one({**doc})
    return doc


@api_router.delete("/team/{invite_id}")
async def remove_team_member(invite_id: str, current_user: User = Depends(get_current_user)):
    await db.team_members.delete_one({"invite_id": invite_id, "owner_id": current_user.user_id})
    return {"deleted": True}


class RoleUpdateIn(BaseModel):
    role: Literal["admin", "safety_manager", "supervisor", "worker"]


@api_router.patch("/team/{invite_id}")
async def update_team_role(invite_id: str, body: RoleUpdateIn, current_user: User = Depends(get_current_user)):
    await db.team_members.update_one(
        {"invite_id": invite_id, "owner_id": current_user.user_id},
        {"$set": {"role": body.role}},
    )
    return {"updated": True}


# ----------- NOTIFICATION PREFERENCES -----------
class NotificationPrefsIn(BaseModel):
    credential_expiry_days: List[int] = [60, 30, 14, 7]
    credential_delivery: Literal["email", "sms", "both", "inapp"] = "both"
    incident_score_threshold: int = 70
    weekly_summary: bool = True
    legislative_digest: Literal["immediate", "weekly", "monthly"] = "weekly"


@api_router.get("/settings/notifications")
async def get_notif_prefs(current_user: User = Depends(get_current_user)):
    doc = await db.notification_prefs.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return doc or NotificationPrefsIn().model_dump()


@api_router.put("/settings/notifications")
async def update_notif_prefs(body: NotificationPrefsIn, current_user: User = Depends(get_current_user)):
    payload = body.model_dump()
    payload["user_id"] = current_user.user_id
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.notification_prefs.update_one(
        {"user_id": current_user.user_id}, {"$set": payload}, upsert=True
    )
    return payload


# ----------- NOTIFICATIONS CENTRE -----------
async def push_notification(user_id: str, tone: str, tag: str, title: str, body: str, link: Optional[str] = None):
    doc = {
        "notification_id": f"ntf_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "tone": tone,  # critical | expiry | insight | update | task
        "tag": tag,
        "title": title,
        "body": body,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one({**doc})
    return doc


@api_router.get("/notifications")
async def list_notifications(current_user: User = Depends(get_current_user)):
    items = await db.notifications.find(
        {"user_id": current_user.user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # If empty, synthesize live notifications from current data
    if not items:
        incidents_list = await db.incidents.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(100)
        licences_list = await db.licences.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(200)
        now = datetime.now(timezone.utc)
        synth = []
        for lic in licences_list:
            try:
                exp = datetime.fromisoformat(lic["expiry_date"])
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                days = (exp - now).days
                if days < 0:
                    synth.append({"notification_id": f"synth_{lic['licence_id']}", "user_id": current_user.user_id, "tone": "critical", "tag": "LICENCE", "title": f"{lic['licence_type'].replace('_', ' ').title()} expired", "body": f"Expired {-days} days ago. Renew immediately.", "link": "/dashboard/licences", "read": False, "created_at": lic.get("created_at")})
                elif days <= 30:
                    synth.append({"notification_id": f"synth_{lic['licence_id']}", "user_id": current_user.user_id, "tone": "expiry", "tag": "LICENCE", "title": f"{lic['licence_type'].replace('_', ' ').title()} expiring", "body": f"Expires in {days} days. Plan renewal.", "link": "/dashboard/licences", "read": False, "created_at": lic.get("created_at")})
            except Exception:
                pass
        for inc in incidents_list:
            if inc.get("severity") in ("serious", "critical"):
                synth.append({"notification_id": f"synth_{inc['incident_id']}", "user_id": current_user.user_id, "tone": "critical", "tag": "INCIDENT", "title": f"{inc['severity'].title()} incident logged", "body": inc.get("title", ""), "link": "/dashboard/incidents", "read": False, "created_at": inc.get("created_at")})
        return synth[:20]
    return items


@api_router.post("/notifications/{notification_id}/read")
async def mark_read(notification_id: str, current_user: User = Depends(get_current_user)):
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": current_user.user_id},
        {"$set": {"read": True}},
    )
    return {"read": True}


@api_router.post("/notifications/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user.user_id, "read": False},
        {"$set": {"read": True}},
    )
    return {"success": True}


# ----------- ONBOARDING STATE -----------
class OnboardingIn(BaseModel):
    step: int
    data: dict = {}
    completed: bool = False


@api_router.get("/onboarding")
async def get_onboarding(current_user: User = Depends(get_current_user)):
    doc = await db.onboarding.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return doc or {"user_id": current_user.user_id, "step": 1, "completed": False, "data": {}}


@api_router.put("/onboarding")
async def update_onboarding(body: OnboardingIn, current_user: User = Depends(get_current_user)):
    payload = body.model_dump()
    payload["user_id"] = current_user.user_id
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.onboarding.update_one(
        {"user_id": current_user.user_id}, {"$set": payload}, upsert=True
    )
    # mirror completion onto user
    if body.completed:
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": {"onboarding_complete": True}},
        )
    return payload



# ============================================================
# GENERIC SAFETY MODULES (batch b)
# toolbox_talks | plant | substances | inspections | risks | first_aid | ppe
# ============================================================
_SAFETY_MODULES = {"toolbox_talks", "plant", "substances", "inspections", "risks", "first_aid", "ppe"}
_ID_PREFIX = {
    "toolbox_talks": "tbt", "plant": "plt", "substances": "sub",
    "inspections": "ins", "risks": "rsk", "first_aid": "fa", "ppe": "ppe",
}


def _validate_module(module: str):
    if module not in _SAFETY_MODULES:
        raise HTTPException(404, f"Unknown safety module: {module}")


def _compute_risk_level(likelihood: int, consequence: int) -> str:
    score = (likelihood or 0) * (consequence or 0)
    if score <= 4:
        return "low"
    if score <= 9:
        return "medium"
    if score <= 15:
        return "high"
    return "extreme"


def _safe_int(v):
    try:
        return int(v) if v not in (None, "") else 0
    except (TypeError, ValueError):
        return 0


def _enrich(module: str, item: dict) -> dict:
    """Add computed fields by module type."""
    if module == "risks":
        lk = _safe_int(item.get("likelihood"))
        cq = _safe_int(item.get("consequence"))
        item["inherent_score"] = lk * cq
        item["inherent_level"] = _compute_risk_level(lk, cq)
        rlk = _safe_int(item.get("residual_likelihood"))
        rcq = _safe_int(item.get("residual_consequence"))
        if rlk and rcq:
            item["residual_score"] = rlk * rcq
            item["residual_level"] = _compute_risk_level(rlk, rcq)
    if module in ("plant", "ppe"):
        # status based on next_inspection / next_service
        now = datetime.now(timezone.utc)
        for date_field in ("next_inspection", "next_service", "rego_expiry"):
            v = item.get(date_field)
            if v:
                try:
                    d = datetime.fromisoformat(v).replace(tzinfo=timezone.utc)
                    days = (d - now).days
                    item[f"{date_field}_days"] = days
                except Exception:
                    pass
    if module == "toolbox_talks":
        # default status
        item.setdefault("status", "scheduled")
    return item


@api_router.get("/safety/summary")
async def safety_summary(current_user: User = Depends(get_current_user)):
    """Returns counts per module for dashboard widgets. Must be defined BEFORE generic /safety/{module}."""
    out = {}
    for m in _SAFETY_MODULES:
        out[m] = await db[f"safety_{m}"].count_documents({"user_id": current_user.user_id})
    return out


@api_router.get("/safety/{module}")
async def list_safety_items(module: str, current_user: User = Depends(get_current_user)):
    _validate_module(module)
    items = await db[f"safety_{module}"].find(
        {"user_id": current_user.user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return [_enrich(module, i) for i in items]


@api_router.post("/safety/{module}")
async def create_safety_item(module: str, body: dict, current_user: User = Depends(get_current_user)):
    _validate_module(module)
    # coerce numeric fields per module so storage is well-typed
    if module == "risks":
        for k in ("likelihood", "consequence", "residual_likelihood", "residual_consequence"):
            if k in body and body[k] not in (None, ""):
                body[k] = _safe_int(body[k])
    item_id = f"{_ID_PREFIX[module]}_{uuid.uuid4().hex[:10]}"
    doc = {
        "item_id": item_id,
        "user_id": current_user.user_id,
        "module": module,
        **body,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db[f"safety_{module}"].insert_one({**doc})
    return _enrich(module, doc)


@api_router.patch("/safety/{module}/{item_id}")
async def update_safety_item(module: str, item_id: str, body: dict, current_user: User = Depends(get_current_user)):
    _validate_module(module)
    updates = {k: v for k, v in body.items() if k not in ("_id", "user_id", "item_id", "created_at")}
    if module == "risks":
        for k in ("likelihood", "consequence", "residual_likelihood", "residual_consequence"):
            if k in updates and updates[k] not in (None, ""):
                updates[k] = _safe_int(updates[k])
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db[f"safety_{module}"].update_one(
        {"item_id": item_id, "user_id": current_user.user_id},
        {"$set": updates},
    )
    doc = await db[f"safety_{module}"].find_one(
        {"item_id": item_id, "user_id": current_user.user_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Not found")
    return _enrich(module, doc)


@api_router.delete("/safety/{module}/{item_id}")
async def delete_safety_item(module: str, item_id: str, current_user: User = Depends(get_current_user)):
    _validate_module(module)
    res = await db[f"safety_{module}"].delete_one(
        {"item_id": item_id, "user_id": current_user.user_id}
    )
    return {"deleted": res.deleted_count}










# ----------- INCLUDE & MIDDLEWARE -----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
