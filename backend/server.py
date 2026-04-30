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


# ============================================================
# REPORTS (Prompt 21) — 10 report types computed on-the-fly
# ============================================================
_REPORT_TYPES = {
    "compliance_score", "incidents_trend", "licence_expiry", "training_matrix",
    "swms_register", "toolbox_talks_log", "risk_register_export",
    "inspections_summary", "plant_register", "worker_roster",
}

_REPORT_META = {
    "compliance_score":     {"title": "Compliance Score Report",       "desc": "Overall compliance posture, score breakdown by pillar, and trend over last 90 days."},
    "incidents_trend":      {"title": "Incidents Trend Report",        "desc": "Incidents by type, severity, injury class and month — WorkSafe-ready."},
    "licence_expiry":       {"title": "Licence Expiry Report",         "desc": "All worker licences grouped by status (valid / expiring / expired)."},
    "training_matrix":      {"title": "Training Matrix",               "desc": "Worker × licence/training — gap analysis."},
    "swms_register":        {"title": "SWMS Register",                 "desc": "All SWMS documents with status, date, trade and site."},
    "toolbox_talks_log":    {"title": "Toolbox Talks Log",              "desc": "All toolbox talks with topic, date, site, attendees."},
    "risk_register_export": {"title": "Risk Register Export",          "desc": "Full risk register with inherent/residual scores, owner, review date."},
    "inspections_summary":  {"title": "Inspections Summary",           "desc": "Inspections by type and outcome, overdue flags."},
    "plant_register":       {"title": "Plant & Equipment Register",    "desc": "Equipment list with next inspection, next service, rego expiry."},
    "worker_roster":        {"title": "Worker Roster",                 "desc": "Active workers with role, trade, start date, site assignment."},
}


@api_router.get("/reports")
async def list_reports(current_user: User = Depends(get_current_user)):
    """Returns catalogue of available reports."""
    return [{"type": t, **meta} for t, meta in _REPORT_META.items()]


@api_router.get("/reports/{report_type}")
async def get_report(report_type: str, current_user: User = Depends(get_current_user)):
    """Returns computed report data for the given type."""
    if report_type not in _REPORT_TYPES:
        raise HTTPException(404, f"Unknown report type: {report_type}")

    uid = current_user.user_id
    now = datetime.now(timezone.utc)
    meta = _REPORT_META[report_type]

    if report_type == "compliance_score":
        # Simple compliance score
        docs_total = await db.documents.count_documents({"user_id": uid})
        workers_total = await db.workers.count_documents({"user_id": uid})
        licences = await db.licences.find({"user_id": uid}, {"_id": 0}).to_list(1000)
        incidents = await db.incidents.find({"user_id": uid}, {"_id": 0}).to_list(1000)
        expired = 0
        expiring = 0
        for lic in licences:
            exp = lic.get("expiry_date")
            if exp:
                try:
                    d = datetime.fromisoformat(exp).replace(tzinfo=timezone.utc)
                    days = (d - now).days
                    if days < 0:
                        expired += 1
                    elif days <= 30:
                        expiring += 1
                except Exception:
                    pass
        open_incidents = sum(1 for i in incidents if (i.get("status") or "").lower() not in ("closed", "resolved"))
        # naive scoring
        score = 100
        score -= expired * 10
        score -= expiring * 3
        score -= open_incidents * 5
        score = max(0, min(100, score))
        return {
            "meta": meta, "generated_at": now.isoformat(), "score": score,
            "pillars": [
                {"key": "documents", "label": "Documents", "value": docs_total, "status": "good" if docs_total > 0 else "warn"},
                {"key": "workers", "label": "Workers", "value": workers_total, "status": "good" if workers_total > 0 else "warn"},
                {"key": "licences_valid", "label": "Valid licences", "value": len(licences) - expired - expiring, "status": "good"},
                {"key": "licences_expiring", "label": "Expiring ≤30d", "value": expiring, "status": "warn" if expiring else "good"},
                {"key": "licences_expired", "label": "Expired", "value": expired, "status": "bad" if expired else "good"},
                {"key": "incidents_open", "label": "Open incidents", "value": open_incidents, "status": "bad" if open_incidents else "good"},
            ],
        }

    if report_type == "incidents_trend":
        incidents = await db.incidents.find({"user_id": uid}, {"_id": 0}).to_list(5000)
        by_type = {}
        by_severity = {}
        by_month = {}
        for i in incidents:
            by_type[i.get("type", "other")] = by_type.get(i.get("type", "other"), 0) + 1
            by_severity[i.get("severity", "unknown")] = by_severity.get(i.get("severity", "unknown"), 0) + 1
            d = i.get("occurred_at") or i.get("created_at")
            if d:
                key = d[:7]
                by_month[key] = by_month.get(key, 0) + 1
        return {"meta": meta, "generated_at": now.isoformat(), "total": len(incidents),
                "by_type": by_type, "by_severity": by_severity, "by_month": by_month,
                "rows": incidents[:200]}

    if report_type == "licence_expiry":
        licences = await db.licences.find({"user_id": uid}, {"_id": 0}).to_list(2000)
        out = {"valid": [], "expiring": [], "expired": []}
        for lic in licences:
            exp = lic.get("expiry_date")
            days = None
            if exp:
                try:
                    d = datetime.fromisoformat(exp).replace(tzinfo=timezone.utc)
                    days = (d - now).days
                except Exception:
                    pass
            lic["days_to_expiry"] = days
            if days is None or days > 30:
                out["valid"].append(lic)
            elif days < 0:
                out["expired"].append(lic)
            else:
                out["expiring"].append(lic)
        return {"meta": meta, "generated_at": now.isoformat(),
                "counts": {k: len(v) for k, v in out.items()}, **out}

    if report_type == "training_matrix":
        workers = await db.workers.find({"user_id": uid}, {"_id": 0}).to_list(500)
        licences = await db.licences.find({"user_id": uid}, {"_id": 0}).to_list(2000)
        # build types
        lic_types = sorted({lic.get("licence_type", "Unknown") for lic in licences})
        # map worker_id -> set of licence_type
        worker_lic = {}
        for lic in licences:
            wid = lic.get("worker_id")
            if wid:
                worker_lic.setdefault(wid, set()).add(lic.get("licence_type", "Unknown"))
        matrix = []
        for w in workers:
            held = worker_lic.get(w.get("worker_id") or w.get("id") or "", set())
            matrix.append({
                "worker_id": w.get("worker_id") or w.get("id"),
                "name": w.get("name"),
                "role": w.get("role"),
                "trade": w.get("trade"),
                "held": list(held),
                "gaps": [t for t in lic_types if t not in held],
            })
        return {"meta": meta, "generated_at": now.isoformat(),
                "licence_types": lic_types, "workers_count": len(workers), "rows": matrix}

    if report_type == "swms_register":
        docs = await db.documents.find({"user_id": uid}, {"_id": 0}).to_list(1000)
        return {"meta": meta, "generated_at": now.isoformat(), "total": len(docs), "rows": docs}

    if report_type == "toolbox_talks_log":
        rows = await db.safety_toolbox_talks.find({"user_id": uid}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)
        return {"meta": meta, "generated_at": now.isoformat(), "total": len(rows), "rows": rows}

    if report_type == "risk_register_export":
        rows = await db.safety_risks.find({"user_id": uid}, {"_id": 0}).to_list(500)
        rows = [_enrich("risks", r) for r in rows]
        return {"meta": meta, "generated_at": now.isoformat(), "total": len(rows), "rows": rows}

    if report_type == "inspections_summary":
        rows = await db.safety_inspections.find({"user_id": uid}, {"_id": 0}).to_list(500)
        by_outcome = {}
        for r in rows:
            by_outcome[r.get("outcome", "pending")] = by_outcome.get(r.get("outcome", "pending"), 0) + 1
        return {"meta": meta, "generated_at": now.isoformat(), "total": len(rows), "by_outcome": by_outcome, "rows": rows}

    if report_type == "plant_register":
        rows = await db.safety_plant.find({"user_id": uid}, {"_id": 0}).to_list(500)
        rows = [_enrich("plant", r) for r in rows]
        return {"meta": meta, "generated_at": now.isoformat(), "total": len(rows), "rows": rows}

    if report_type == "worker_roster":
        rows = await db.workers.find({"user_id": uid}, {"_id": 0}).to_list(500)
        return {"meta": meta, "generated_at": now.isoformat(), "total": len(rows), "rows": rows}

    return {"meta": meta, "generated_at": now.isoformat(), "rows": []}


def _summarise_report_for_llm(report_type: str, data: dict) -> str:
    """Produces a compact JSON-like string of key facts for the LLM — avoids sending full rows."""
    meta = data.get("meta", {})
    parts = [f"Report: {meta.get('title', report_type)}"]
    if report_type == "compliance_score":
        parts.append(f"Score: {data.get('score')}/100")
        parts.append("Pillars:")
        for p in data.get("pillars", []):
            parts.append(f"  - {p['label']}: {p['value']} ({p['status']})")
    elif report_type == "incidents_trend":
        parts.append(f"Total incidents: {data.get('total')}")
        parts.append(f"By severity: {data.get('by_severity')}")
        parts.append(f"By type: {data.get('by_type')}")
        parts.append(f"By month: {data.get('by_month')}")
    elif report_type == "licence_expiry":
        parts.append(f"Counts: {data.get('counts')}")
        top_exp = data.get("expired", [])[:5] + data.get("expiring", [])[:5]
        for lic in top_exp:
            parts.append(f"  - {lic.get('licence_type')} for {lic.get('worker_name') or lic.get('holder_name') or '—'}: {lic.get('days_to_expiry')}d")
    elif report_type == "training_matrix":
        parts.append(f"Workers: {data.get('workers_count')} · Licence types: {len(data.get('licence_types', []))}")
        for w in data.get("rows", [])[:10]:
            parts.append(f"  - {w.get('name')} ({w.get('trade')}): gaps = {w.get('gaps')}")
    else:
        parts.append(f"Total rows: {data.get('total', len(data.get('rows', [])))}")
        if data.get("by_outcome"):
            parts.append(f"By outcome: {data.get('by_outcome')}")
    return "\n".join(parts)


@api_router.post("/reports/{report_type}/insights")
async def get_report_insights(report_type: str, current_user: User = Depends(get_current_user)):
    """Claude Sonnet 4.5 analyses the report and returns summary + 3 recommended actions. 24h cache."""
    if report_type not in _REPORT_TYPES:
        raise HTTPException(404, f"Unknown report type: {report_type}")

    # 24h cache
    cached = await db.report_insights.find_one(
        {"user_id": current_user.user_id, "report_type": report_type}, {"_id": 0}
    )
    if cached:
        try:
            gen = datetime.fromisoformat(cached["generated_at"])
            if (datetime.now(timezone.utc) - gen).total_seconds() < 86400:
                cached["cached"] = True
                return cached
        except Exception:
            pass

    # Regenerate report data (reuse the same path)
    report_data = await get_report(report_type, current_user)  # type: ignore
    summary_text = _summarise_report_for_llm(report_type, report_data)

    sys_msg = (
        "You are a senior Australian WHS consultant analysing a compliance report for a trade business. "
        "Respond in plain English, practical and specific. Reference WHS Act/Regulations or AS/NZS only when relevant."
    )
    user_prompt = (
        f"Analyse this report data and provide:\n"
        f"1) A 2–3 sentence plain-English summary of the current state.\n"
        f"2) Exactly 3 prioritised, specific recommended actions the business owner should take next.\n"
        f"Return pure JSON with keys: summary (string), actions (array of 3 objects each with "
        f"{{priority: 'high'|'medium'|'low', action: string, why: string}}). No prose outside the JSON.\n\n"
        f"REPORT DATA:\n{summary_text}"
    )

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insights_{uuid.uuid4().hex[:8]}",
            system_message=sys_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        def _run_llm():
            return asyncio.run(chat.send_message(UserMessage(text=user_prompt)))

        raw = await asyncio.wait_for(asyncio.to_thread(_run_llm), timeout=50.0)
    except asyncio.TimeoutError:
        raise HTTPException(503, "AI provider is slow/unavailable — please retry shortly.")
    except Exception as e:
        logger.exception("AI insights failed")
        # Graceful fallback so UI doesn't crash when LLM budget exhausted etc.
        fallback = {
            "user_id": current_user.user_id,
            "report_type": report_type,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": "AI insights are temporarily unavailable. Review the raw report and prioritise overdue licences, open incidents, and overdue inspections first.",
            "actions": [
                {"priority": "high", "action": "Review the report data below", "why": "AI provider unavailable — human review recommended."},
                {"priority": "medium", "action": "Check /dashboard/notifications for any unread alerts", "why": "Time-sensitive items often surface there first."},
                {"priority": "low", "action": "Retry AI insights later", "why": f"Last error: {str(e)[:120]}"},
            ],
            "cached": False,
            "fallback": True,
        }
        return fallback

    # Try parse JSON
    import json as _json, re as _re
    parsed = None
    try:
        parsed = _json.loads(raw)
    except Exception:
        m = _re.search(r"\{[\s\S]*\}", raw or "")
        if m:
            try:
                parsed = _json.loads(m.group(0))
            except Exception:
                parsed = None
    if not parsed or "summary" not in parsed or "actions" not in parsed:
        parsed = {"summary": (raw or "")[:500], "actions": []}

    result = {
        "user_id": current_user.user_id,
        "report_type": report_type,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": parsed.get("summary", ""),
        "actions": parsed.get("actions", []),
        "cached": False,
    }
    # upsert
    await db.report_insights.update_one(
        {"user_id": current_user.user_id, "report_type": report_type},
        {"$set": result},
        upsert=True,
    )
    return result


# ============================================================
# WORKFLOWS (Batch c) — W1..W5 instances with stepped progress
# ============================================================
_WORKFLOW_TYPES = {"new_employee", "incident_resolution", "swms_job_start", "annual_review", "subcontractor"}
_WORKFLOW_STEPS = {
    "new_employee": [
        {"key": "profile", "label": "Worker profile created"},
        {"key": "induction", "label": "Site induction completed"},
        {"key": "licences", "label": "Licences uploaded & verified"},
        {"key": "ppe", "label": "PPE issued"},
        {"key": "toolbox", "label": "First toolbox talk attended"},
        {"key": "swms_read", "label": "SWMS read & signed"},
        {"key": "ready", "label": "Ready for work"},
    ],
    "incident_resolution": [
        {"key": "reported", "label": "Incident reported"},
        {"key": "triage", "label": "Triaged & notifier assigned"},
        {"key": "regulator", "label": "Regulator notified (if required)"},
        {"key": "investigation", "label": "Root-cause investigation"},
        {"key": "corrective", "label": "Corrective actions defined"},
        {"key": "implemented", "label": "Corrective actions implemented"},
        {"key": "closed", "label": "Closed out & learnings shared"},
    ],
    "swms_job_start": [
        {"key": "draft", "label": "SWMS drafted"},
        {"key": "reviewed", "label": "Reviewed by safety manager"},
        {"key": "approved", "label": "Approved for job"},
        {"key": "site_brief", "label": "Pre-start site brief"},
        {"key": "signoff", "label": "Worker sign-off captured"},
        {"key": "started", "label": "Job started"},
    ],
    "annual_review": [
        {"key": "scope", "label": "Define review scope"},
        {"key": "policies", "label": "WHS policies reviewed"},
        {"key": "registers", "label": "Registers reconciled (risk, plant, substances)"},
        {"key": "incidents", "label": "12-month incident review"},
        {"key": "training", "label": "Training compliance checked"},
        {"key": "audit", "label": "Internal audit run"},
        {"key": "signoff", "label": "Management sign-off"},
    ],
    "subcontractor": [
        {"key": "invite", "label": "Subcontractor invited"},
        {"key": "company", "label": "Company details captured"},
        {"key": "insurance", "label": "Insurance certificates on file"},
        {"key": "licences", "label": "Licences verified"},
        {"key": "swms", "label": "SWMS approved"},
        {"key": "induction", "label": "Induction completed"},
        {"key": "engaged", "label": "Engaged & active"},
    ],
}


def _validate_workflow(wtype: str):
    if wtype not in _WORKFLOW_TYPES:
        raise HTTPException(404, f"Unknown workflow type: {wtype}")


def _workflow_progress(steps: list) -> dict:
    total = len(steps) or 1
    done = sum(1 for s in steps if s.get("completed"))
    pct = round(done / total * 100)
    status = "not_started"
    if done == total:
        status = "complete"
    elif done > 0:
        status = "in_progress"
    return {"progress_pct": pct, "completed_steps": done, "total_steps": total, "status": status}


@api_router.get("/workflows/catalog")
async def workflows_catalog(current_user: User = Depends(get_current_user)):
    return [{"type": t, "steps": s} for t, s in _WORKFLOW_STEPS.items()]


@api_router.get("/workflows/summary")
async def workflows_summary(current_user: User = Depends(get_current_user)):
    """Counts per workflow type + status distribution."""
    out = {}
    for t in _WORKFLOW_TYPES:
        rows = await db.workflows.find({"user_id": current_user.user_id, "workflow_type": t}, {"_id": 0}).to_list(1000)
        dist = {"not_started": 0, "in_progress": 0, "complete": 0}
        for r in rows:
            prog = _workflow_progress(r.get("steps", []))
            dist[prog["status"]] += 1
        out[t] = {"total": len(rows), **dist}
    return out


@api_router.get("/workflows/{wtype}")
async def list_workflows(wtype: str, current_user: User = Depends(get_current_user)):
    _validate_workflow(wtype)
    rows = await db.workflows.find(
        {"user_id": current_user.user_id, "workflow_type": wtype}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    for r in rows:
        r.update(_workflow_progress(r.get("steps", [])))
    return rows


@api_router.post("/workflows/{wtype}")
async def create_workflow(wtype: str, body: dict, current_user: User = Depends(get_current_user)):
    _validate_workflow(wtype)
    instance_id = f"wf_{uuid.uuid4().hex[:10]}"
    # initialise steps from template, steps may be overridden via body.steps
    default_steps = [{**s, "completed": False, "completed_at": None} for s in _WORKFLOW_STEPS[wtype]]
    doc = {
        "instance_id": instance_id,
        "user_id": current_user.user_id,
        "workflow_type": wtype,
        "title": body.get("title") or f"{wtype} workflow",
        "entity_id": body.get("entity_id"),
        "entity_name": body.get("entity_name"),
        "notes": body.get("notes", ""),
        "steps": body.get("steps") or default_steps,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workflows.insert_one({**doc})
    doc.update(_workflow_progress(doc["steps"]))
    return doc


@api_router.patch("/workflows/{wtype}/{instance_id}")
async def update_workflow(wtype: str, instance_id: str, body: dict, current_user: User = Depends(get_current_user)):
    _validate_workflow(wtype)
    updates = {k: v for k, v in body.items() if k not in ("_id", "user_id", "instance_id", "created_at", "workflow_type")}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.workflows.update_one(
        {"instance_id": instance_id, "user_id": current_user.user_id, "workflow_type": wtype},
        {"$set": updates},
    )
    doc = await db.workflows.find_one(
        {"instance_id": instance_id, "user_id": current_user.user_id, "workflow_type": wtype}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Not found")
    doc.update(_workflow_progress(doc.get("steps", [])))
    return doc


@api_router.post("/workflows/{wtype}/{instance_id}/step")
async def toggle_workflow_step(wtype: str, instance_id: str, body: dict, current_user: User = Depends(get_current_user)):
    """body = {step_key: str, completed: bool}"""
    _validate_workflow(wtype)
    step_key = body.get("step_key")
    completed = bool(body.get("completed"))
    doc = await db.workflows.find_one(
        {"instance_id": instance_id, "user_id": current_user.user_id, "workflow_type": wtype}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Not found")
    steps = doc.get("steps", [])
    for s in steps:
        if s.get("key") == step_key:
            s["completed"] = completed
            s["completed_at"] = datetime.now(timezone.utc).isoformat() if completed else None
            break
    await db.workflows.update_one(
        {"instance_id": instance_id, "user_id": current_user.user_id, "workflow_type": wtype},
        {"$set": {"steps": steps, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    doc["steps"] = steps
    doc.update(_workflow_progress(steps))
    return doc


@api_router.delete("/workflows/{wtype}/{instance_id}")
async def delete_workflow(wtype: str, instance_id: str, current_user: User = Depends(get_current_user)):
    _validate_workflow(wtype)
    res = await db.workflows.delete_one(
        {"instance_id": instance_id, "user_id": current_user.user_id, "workflow_type": wtype}
    )
    return {"deleted": res.deleted_count}


# ============================================================
# BATCH (d) — Ecosystem Apps
# ============================================================

# -------- TradeInduct: induction programs + invite codes --------
@api_router.get("/tradeinduct/programs")
async def list_induction_programs(current_user: User = Depends(get_current_user)):
    rows = await db.induction_programs.find({"user_id": current_user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rows


@api_router.post("/tradeinduct/programs")
async def create_induction_program(body: dict, current_user: User = Depends(get_current_user)):
    pid = f"ip_{uuid.uuid4().hex[:10]}"
    code = body.get("code") or uuid.uuid4().hex[:6].upper()
    # ensure uniqueness across ALL programs
    while await db.induction_programs.find_one({"code": code}):
        code = uuid.uuid4().hex[:6].upper()
    doc = {
        "program_id": pid,
        "user_id": current_user.user_id,
        "code": code,
        "title": body.get("title") or "Site induction",
        "site": body.get("site", ""),
        "trade": body.get("trade", ""),
        "questions": body.get("questions") or [
            {"q": "Have you read the site-specific SWMS?", "required": True},
            {"q": "Do you hold a valid White Card?", "required": True},
            {"q": "Do you have the PPE required for this site?", "required": True},
            {"q": "Have you been briefed on emergency procedures?", "required": True},
            {"q": "Any pre-existing medical conditions we should know about?", "required": False},
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.induction_programs.insert_one({**doc})
    return doc


@api_router.delete("/tradeinduct/programs/{program_id}")
async def delete_induction_program(program_id: str, current_user: User = Depends(get_current_user)):
    res = await db.induction_programs.delete_one({"program_id": program_id, "user_id": current_user.user_id})
    return {"deleted": res.deleted_count}


@api_router.get("/tradeinduct/programs/{program_id}/submissions")
async def list_submissions(program_id: str, current_user: User = Depends(get_current_user)):
    rows = await db.induction_submissions.find(
        {"user_id": current_user.user_id, "program_id": program_id}, {"_id": 0}
    ).sort("submitted_at", -1).to_list(500)
    return rows


# Public endpoint — worker completes induction via invite code (no auth)
@api_router.get("/tradeinduct/public/{code}")
async def public_induction_program(code: str):
    prog = await db.induction_programs.find_one({"code": code.upper()}, {"_id": 0})
    if not prog:
        raise HTTPException(404, "Unknown induction code")
    return {"program_id": prog["program_id"], "title": prog["title"], "site": prog.get("site"),
            "trade": prog.get("trade"), "questions": prog.get("questions", []), "code": prog["code"]}


@api_router.post("/tradeinduct/public/{code}/submit")
async def submit_induction(code: str, body: dict):
    prog = await db.induction_programs.find_one({"code": code.upper()}, {"_id": 0})
    if not prog:
        raise HTTPException(404, "Unknown induction code")
    sub_id = f"sub_{uuid.uuid4().hex[:10]}"
    doc = {
        "submission_id": sub_id,
        "program_id": prog["program_id"],
        "user_id": prog["user_id"],
        "worker_name": body.get("worker_name", ""),
        "worker_email": body.get("worker_email", ""),
        "worker_phone": body.get("worker_phone", ""),
        "answers": body.get("answers", []),
        "signature": body.get("signature", ""),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "certificate_id": f"cert_{uuid.uuid4().hex[:10]}",
    }
    await db.induction_submissions.insert_one({**doc})
    return {"certificate_id": doc["certificate_id"], "submitted_at": doc["submitted_at"],
            "program_title": prog["title"], "worker_name": doc["worker_name"]}


# -------- TradeCheck: verified contractor marketplace --------
@api_router.get("/tradecheck/listings")
async def list_tradecheck(trade: Optional[str] = None, state: Optional[str] = None):
    """Public listing — returns verified contractors."""
    q = {"status": "verified"}
    if trade: q["trade"] = trade
    if state: q["state"] = state
    rows = await db.tradecheck_listings.find(q, {"_id": 0, "user_id": 0}).sort("rating", -1).to_list(200)
    return rows


@api_router.post("/tradecheck/listings")
async def create_tradecheck(body: dict, current_user: User = Depends(get_current_user)):
    """Business owner creates their own listing."""
    existing = await db.tradecheck_listings.find_one({"user_id": current_user.user_id}, {"_id": 0})
    listing_id = existing.get("listing_id") if existing else f"tc_{uuid.uuid4().hex[:10]}"
    doc = {
        "listing_id": listing_id,
        "user_id": current_user.user_id,
        "business_name": body.get("business_name", ""),
        "trade": body.get("trade", ""),
        "state": body.get("state", ""),
        "abn": body.get("abn", ""),
        "years_trading": body.get("years_trading", 0),
        "team_size": body.get("team_size", 0),
        "licences": body.get("licences", []),
        "insurance": body.get("insurance", []),
        "certifications": body.get("certifications", []),
        "description": body.get("description", ""),
        "contact_email": body.get("contact_email", ""),
        "contact_phone": body.get("contact_phone", ""),
        "rating": body.get("rating", 0),
        "status": body.get("status", "pending"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tradecheck_listings.update_one(
        {"listing_id": listing_id}, {"$set": doc}, upsert=True
    )
    return doc


@api_router.get("/tradecheck/my")
async def get_my_tradecheck(current_user: User = Depends(get_current_user)):
    doc = await db.tradecheck_listings.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return doc or {}


@api_router.post("/tradecheck/verify/{listing_id}")
async def verify_tradecheck(listing_id: str, current_user: User = Depends(get_current_user)):
    """Mark own listing as verified (simplified — real flow would require admin review)."""
    await db.tradecheck_listings.update_one(
        {"listing_id": listing_id, "user_id": current_user.user_id},
        {"$set": {"status": "verified", "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}


# -------- Academy LMS: courses, enrolments, certificates --------
_ACADEMY_COURSES = [
    {"course_id": "c_whs_fundamentals", "title": "WHS Fundamentals for Tradies", "duration_mins": 60, "modules": 6,
     "description": "Essential WHS duties, rights and responsibilities under the Australian WHS Act.",
     "topics": ["Duty of care", "Consultation", "Risk management", "Incident reporting", "First aid", "Recordkeeping"]},
    {"course_id": "c_working_heights", "title": "Working Safely at Heights", "duration_mins": 45, "modules": 5,
     "description": "Working above 2m — controls, equipment, rescue, and legal obligations.",
     "topics": ["Fall-prevention hierarchy", "Scaffold vs edge protection", "Harness inspection", "Rescue plans", "Recordkeeping"]},
    {"course_id": "c_electrical_safety", "title": "Electrical Safety Essentials", "duration_mins": 40, "modules": 4,
     "description": "Electrical hazards on trade sites — isolation, test-before-touch, and RCDs.",
     "topics": ["Isolation procedures", "Test and tag", "Portable appliance testing", "Emergency response"]},
    {"course_id": "c_manual_handling", "title": "Manual Handling & Musculoskeletal", "duration_mins": 30, "modules": 4,
     "description": "Reduce the #1 cause of worker injury in construction.",
     "topics": ["Risk assessment", "Lifting technique", "Team lifts", "Mechanical aids"]},
    {"course_id": "c_mental_health", "title": "Mental Health & Psychosocial", "duration_mins": 50, "modules": 5,
     "description": "Recognising and responding to psychosocial hazards — mandated since 2023.",
     "topics": ["Psychosocial hazards", "Workload & control", "Bullying prevention", "Talking to mates", "Support resources"]},
    {"course_id": "c_confined_space", "title": "Confined Space Entry", "duration_mins": 55, "modules": 5,
     "description": "Permit-to-work, gas testing, and rescue plans for confined spaces.",
     "topics": ["Permit system", "Atmospheric testing", "Stand-by person", "Rescue drill", "Recordkeeping"]},
    {"course_id": "c_incident_investigation", "title": "Incident Investigation", "duration_mins": 45, "modules": 4,
     "description": "Root-cause analysis and 5-Whys for real site incidents.",
     "topics": ["Sequence of events", "5-Whys", "Corrective actions", "Learnings and share-back"]},
    {"course_id": "c_sds_hazardous", "title": "Hazardous Substances & SDS", "duration_mins": 35, "modules": 4,
     "description": "Read an SDS in 60 seconds and manage chemical risks.",
     "topics": ["SDS structure", "Labelling (GHS)", "PPE selection", "Spill response"]},
]


@api_router.get("/academy/courses")
async def list_academy_courses(current_user: User = Depends(get_current_user)):
    return _ACADEMY_COURSES


@api_router.get("/academy/enrolments")
async def my_enrolments(current_user: User = Depends(get_current_user)):
    rows = await db.academy_enrolments.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(200)
    return rows


@api_router.post("/academy/enrolments")
async def enrol_course(body: dict, current_user: User = Depends(get_current_user)):
    course_id = body.get("course_id")
    course = next((c for c in _ACADEMY_COURSES if c["course_id"] == course_id), None)
    if not course:
        raise HTTPException(404, "Unknown course")
    existing = await db.academy_enrolments.find_one({"user_id": current_user.user_id, "course_id": course_id}, {"_id": 0})
    if existing:
        return existing
    doc = {
        "enrolment_id": f"en_{uuid.uuid4().hex[:10]}",
        "user_id": current_user.user_id,
        "course_id": course_id,
        "course_title": course["title"],
        "modules_completed": 0,
        "modules_total": course["modules"],
        "progress_pct": 0,
        "status": "enrolled",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "certificate_id": None,
    }
    await db.academy_enrolments.insert_one({**doc})
    return doc


@api_router.post("/academy/enrolments/{enrolment_id}/progress")
async def update_progress(enrolment_id: str, body: dict, current_user: User = Depends(get_current_user)):
    modules_completed = int(body.get("modules_completed", 0))
    doc = await db.academy_enrolments.find_one({"enrolment_id": enrolment_id, "user_id": current_user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    total = doc.get("modules_total") or 1
    modules_completed = max(0, min(modules_completed, total))
    pct = round(modules_completed / total * 100)
    updates = {"modules_completed": modules_completed, "progress_pct": pct}
    if modules_completed >= total:
        updates["status"] = "completed"
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()
        if not doc.get("certificate_id"):
            updates["certificate_id"] = f"cert_{uuid.uuid4().hex[:10]}"
    else:
        updates["status"] = "in_progress" if modules_completed > 0 else "enrolled"
    await db.academy_enrolments.update_one(
        {"enrolment_id": enrolment_id, "user_id": current_user.user_id},
        {"$set": updates}
    )
    doc.update(updates)
    return doc


# -------- Partner / Consultant white-label portal --------
@api_router.get("/partner/clients")
async def list_partner_clients(current_user: User = Depends(get_current_user)):
    rows = await db.partner_clients.find({"user_id": current_user.user_id}, {"_id": 0}).sort("added_at", -1).to_list(500)
    # enrich with quick compliance snapshot
    for r in rows:
        cid = r.get("client_id")
        r["docs_count"] = await db.documents.count_documents({"user_id": cid})
        r["incidents_open"] = await db.incidents.count_documents({"user_id": cid, "status": {"$nin": ["closed", "resolved"]}})
        r["licences_total"] = await db.licences.count_documents({"user_id": cid})
    return rows


@api_router.post("/partner/clients")
async def add_partner_client(body: dict, current_user: User = Depends(get_current_user)):
    cid = f"pc_{uuid.uuid4().hex[:10]}"
    doc = {
        "client_id": cid,
        "user_id": current_user.user_id,  # partner's user id
        "business_name": body.get("business_name", ""),
        "contact_name": body.get("contact_name", ""),
        "contact_email": body.get("contact_email", ""),
        "contact_phone": body.get("contact_phone", ""),
        "state": body.get("state", ""),
        "trade": body.get("trade", ""),
        "retainer_monthly": body.get("retainer_monthly", 0),
        "status": body.get("status", "active"),
        "notes": body.get("notes", ""),
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.partner_clients.insert_one({**doc})
    return doc


@api_router.patch("/partner/clients/{client_id}")
async def update_partner_client(client_id: str, body: dict, current_user: User = Depends(get_current_user)):
    updates = {k: v for k, v in body.items() if k not in ("_id", "user_id", "client_id", "added_at")}
    await db.partner_clients.update_one(
        {"client_id": client_id, "user_id": current_user.user_id}, {"$set": updates}
    )
    doc = await db.partner_clients.find_one(
        {"client_id": client_id, "user_id": current_user.user_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api_router.delete("/partner/clients/{client_id}")
async def delete_partner_client(client_id: str, current_user: User = Depends(get_current_user)):
    res = await db.partner_clients.delete_one({"client_id": client_id, "user_id": current_user.user_id})
    return {"deleted": res.deleted_count}


@api_router.get("/partner/summary")
async def partner_summary(current_user: User = Depends(get_current_user)):
    clients = await db.partner_clients.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(500)
    total = len(clients)
    active = sum(1 for c in clients if c.get("status") == "active")
    mrr = sum(c.get("retainer_monthly", 0) for c in clients if c.get("status") == "active")
    return {"total_clients": total, "active_clients": active, "monthly_recurring_revenue": mrr,
            "at_risk": sum(1 for c in clients if c.get("status") == "at_risk")}


# -------- Mobile Worker app — lightweight "my stuff" endpoints --------
@api_router.get("/worker/my-summary")
async def worker_summary(current_user: User = Depends(get_current_user)):
    uid = current_user.user_id
    now = datetime.now(timezone.utc)
    # "my" data: for a worker role, return assignments.
    # For owner previewing, return aggregate. Simple and pragmatic.
    my_licences = await db.licences.find({"user_id": uid, "worker_email": current_user.email}, {"_id": 0}).to_list(50)
    if not my_licences:
        # fallback to all licences (owner preview)
        my_licences = await db.licences.find({"user_id": uid}, {"_id": 0}).to_list(50)
    expiring = []
    for lic in my_licences:
        exp = lic.get("expiry_date")
        if exp:
            try:
                d = datetime.fromisoformat(exp).replace(tzinfo=timezone.utc)
                days = (d - now).days
                if days <= 60:
                    lic["days_to_expiry"] = days
                    expiring.append(lic)
            except Exception:
                pass
    toolbox = await db.safety_toolbox_talks.find(
        {"user_id": uid}, {"_id": 0}
    ).sort("scheduled_at", -1).to_list(10)
    swms = await db.documents.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(10)
    enrolments = await db.academy_enrolments.find({"user_id": uid}, {"_id": 0}).to_list(20)
    return {
        "name": current_user.name,
        "role": current_user.role,
        "licences_total": len(my_licences),
        "licences_expiring_soon": expiring,
        "upcoming_toolbox": toolbox[:5],
        "recent_swms": swms[:5],
        "my_courses": enrolments,
    }


@api_router.post("/worker/checkin")
async def worker_checkin(body: dict, current_user: User = Depends(get_current_user)):
    doc = {
        "checkin_id": f"ci_{uuid.uuid4().hex[:10]}",
        "user_id": current_user.user_id,
        "worker_email": current_user.email,
        "worker_name": current_user.name,
        "site": body.get("site", ""),
        "notes": body.get("notes", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.worker_checkins.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api_router.get("/worker/checkins")
async def worker_checkins(current_user: User = Depends(get_current_user)):
    rows = await db.worker_checkins.find(
        {"user_id": current_user.user_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(50)
    return rows










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
