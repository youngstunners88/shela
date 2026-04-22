"""
Bhubezi API - Complete Taxi Network Backend
FastAPI + MongoDB + JWT Authentication + Selfie Verification
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import uuid
import os
import base64
import logging
from pathlib import Path
import httpx

# Setup
ROOT_DIR = Path(__file__).parent
load_dotenv = __import__('dotenv').load_dotenv
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'bhubezi')]

# JWT Config
SECRET_KEY = os.environ.get('JWT_SECRET', "bhubezi-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserRole:
    PASSENGER = "passenger"
    DRIVER = "driver"
    MARSHAL = "marshal"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: str
    role: str  # passenger, driver, marshal
    password_hash: Optional[str] = None
    verified: bool = False
    profile_image: Optional[str] = None  # base64 data URI
    selfie_url: Optional[str] = None
    id_document_url: Optional[str] = None
    vehicle: Optional[Dict[str, Any]] = None
    points: int = 100
    current_route_id: Optional[str] = None
    occupancy: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Rank(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    location: str
    category: str  # CBD, Soweto, Alexandra, etc.
    coordinates: Optional[Dict[str, float]] = None

class Route(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    origin_id: str
    destination_id: str
    fare: int
    label: str
    distance_km: Optional[float] = None
    estimated_time_min: Optional[int] = None

class RankStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rank_id: str
    capacity: str  # empty, moving, half_full, full_house, overflowing
    load_estimate: int
    marshal_name: str
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Ping(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    passenger_id: str
    passenger_name: str
    origin_rank_id: str
    destination_rank_id: str
    price: int
    message: str
    accepted_driver_ids: List[str] = []
    accepted_driver_names: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    picked_up: bool = False
    status: str = "active"  # active, accepted, completed, cancelled

class SocialPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    author_name: str
    content: str
    likes: int = 0
    liked_by: List[str] = []
    replies: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Faq(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    answer: Optional[str] = None
    answered_by: Optional[str] = None
    route_id: Optional[str] = None
    verified_by: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== AUTH MODELS ==============

class UserRegister(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    password: str
    role: str = "passenger"
    vehicle_brand: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_plate: Optional[str] = None

class UserLogin(BaseModel):
    phone: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class ProfileImageUpdate(BaseModel):
    image: str  # base64 data URI

# ============== HELPER FUNCTIONS ==============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ============== FASTAPI SETUP ==============

app = FastAPI(title="Bhubezi API", version="2.0.0")
api_router = APIRouter(prefix="/api")

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"phone": user_data.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create user
    vehicle = None
    if user_data.vehicle_brand and user_data.role == "driver":
        vehicle = {
            "brand": user_data.vehicle_brand,
            "color": user_data.vehicle_color or "Unknown",
            "plate": user_data.vehicle_plate or "Unknown"
        }
    
    user = User(
        name=user_data.name,
        phone=user_data.phone,
        email=user_data.email,
        role=user_data.role,
        password_hash=get_password_hash(user_data.password),
        vehicle=vehicle,
        verified=user_data.role != "driver"  # Drivers need verification
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Create token
    access_token = create_access_token({"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.model_dump(exclude={"password_hash"})
    }

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"phone": credentials.phone})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    
    # Update last active
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}}
    )
    
    access_token = create_access_token({"sub": user["id"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {k: v for k, v in user.items() if k != "password_hash" and k != "_id"}
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ============== PROFILE IMAGE ==============

@api_router.post("/auth/profile-image")
async def upload_profile_image(
    data: ProfileImageUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Store profile image as base64 in MongoDB (max ~2MB)"""
    if not data.image.startswith("data:image"):
        raise HTTPException(status_code=400, detail="Invalid image format")
    
    # Limit to ~2MB (base64 overhead ~33%)
    if len(data.image) > 3 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Please use a photo under 2MB.")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"profile_image": data.image}}
    )
    
    return {"success": True, "message": "Profile image saved"}

# ============== SELFIE VERIFICATION ==============

@api_router.post("/auth/verify-selfie")
async def verify_selfie(
    selfie: UploadFile = File(...),
    document: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload selfie and ID document for driver verification"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Only drivers need verification")
    
    # Read and encode selfie as base64
    selfie_bytes = await selfie.read()
    selfie_b64 = "data:image/jpeg;base64," + base64.b64encode(selfie_bytes).decode("utf-8")
    
    doc_b64 = None
    if document:
        doc_bytes = await document.read()
        doc_b64 = "data:image/jpeg;base64," + base64.b64encode(doc_bytes).decode("utf-8")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "profile_image": selfie_b64,
                "selfie_url": selfie_b64,
                "id_document_url": doc_b64,
                "verification_status": "pending"
            }
        }
    )
    
    return {
        "success": True,
        "message": "Selfie and document uploaded. Verification pending.",
        "status": "pending"
    }

@api_router.post("/auth/approve-verification/{user_id}")
async def approve_verification(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marshal/Admin approves driver verification"""
    if current_user.get("role") not in ["marshal", "admin"]:
        raise HTTPException(status_code=403, detail="Only marshals can approve")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"verified": True, "verification_status": "approved"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "Driver verified successfully"}

# ============== TAXI ROUTES ==============

@api_router.get("/taxi-routes", response_model=List[Route])
async def get_taxi_routes():
    routes = await db.routes.find({}, {"_id": 0}).to_list(100)
    return routes

@api_router.get("/taxi-ranks", response_model=List[Rank])
async def get_taxi_ranks():
    ranks = await db.ranks.find({}, {"_id": 0}).to_list(100)
    return ranks

@api_router.get("/rank-status", response_model=List[RankStatus])
async def get_rank_status():
    statuses = await db.rank_statuses.find({}, {"_id": 0}).to_list(100)
    return statuses

@api_router.post("/rank-status")
async def update_rank_status(
    rank_id: str,
    capacity: str,
    load_estimate: int,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ["marshal", "driver"]:
        raise HTTPException(status_code=403, detail="Only marshals and drivers can update")
    
    status = RankStatus(
        rank_id=rank_id,
        capacity=capacity,
        load_estimate=load_estimate,
        marshal_name=current_user.get("name", "Unknown")
    )
    
    await db.rank_statuses.update_one(
        {"rank_id": rank_id},
        {"$set": status.model_dump()},
        upsert=True
    )
    
    # Award points
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"points": 10}}
    )
    
    return {"success": True}

# ============== PING SYSTEM (RIDE REQUESTS) ==============

@api_router.post("/pings")
async def create_ping(
    origin_rank_id: str,
    destination_rank_id: str,
    price: int,
    message: str = "",
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "passenger":
        raise HTTPException(status_code=403, detail="Only passengers can create pings")
    
    ping = Ping(
        passenger_id=current_user["id"],
        passenger_name=current_user["name"],
        origin_rank_id=origin_rank_id,
        destination_rank_id=destination_rank_id,
        price=price,
        message=message
    )
    
    await db.pings.insert_one(ping.model_dump())
    
    # Award points
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"points": 5}}
    )
    
    return {"success": True, "ping": ping.model_dump()}

@api_router.get("/pings/active")
async def get_active_pings():
    pings = await db.pings.find(
        {"status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return pings

@api_router.post("/pings/{ping_id}/accept")
async def accept_ping(
    ping_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can accept pings")
    
    if not current_user.get("verified"):
        raise HTTPException(status_code=403, detail="Driver must be verified")
    
    result = await db.pings.update_one(
        {"id": ping_id, "status": "active"},
        {
            "$push": {
                "accepted_driver_ids": current_user["id"],
                "accepted_driver_names": current_user["name"]
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ping not found or already accepted")
    
    # Award points
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"points": 15}}
    )
    
    return {"success": True}

@api_router.post("/pings/{ping_id}/confirm")
async def confirm_pickup(
    ping_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.pings.update_one(
        {"id": ping_id},
        {"$set": {"picked_up": True, "status": "completed"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ping not found")
    
    return {"success": True}

# ============== DRIVER STATUS ==============

@api_router.post("/driver/status")
async def update_driver_status(
    route_id: Optional[str] = None,
    occupancy: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can update status")
    
    update_data = {}
    if route_id is not None:
        update_data["current_route_id"] = route_id
    if occupancy is not None:
        update_data["occupancy"] = occupancy
    
    update_data["last_active"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    # Award points
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"points": 10}}
    )
    
    return {"success": True}

@api_router.get("/drivers/active")
async def get_active_drivers():
    """Get currently active drivers"""
    five_minutes_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    
    drivers = await db.users.find(
        {
            "role": "driver",
            "verified": True,
            "last_active": {"$gte": five_minutes_ago}
        },
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    return drivers

# ============== SOCIAL FEATURES ==============

@api_router.get("/posts", response_model=List[SocialPost])
async def get_posts():
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return posts

@api_router.post("/posts")
async def create_post(
    content: str,
    current_user: dict = Depends(get_current_user)
):
    post = SocialPost(
        author_id=current_user["id"],
        author_name=current_user["name"],
        content=content
    )
    
    await db.posts.insert_one(post.model_dump())
    
    # Award points
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"points": 5}}
    )
    
    return {"success": True, "post": post.model_dump()}

@api_router.post("/posts/{post_id}/like")
async def like_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.posts.update_one(
        {"id": post_id},
        {
            "$addToSet": {"liked_by": current_user["id"]},
            "$inc": {"likes": 1}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"success": True}

# ============== FAQ ==============

@api_router.get("/faq", response_model=List[Faq])
async def get_faq():
    faqs = await db.faq.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return faqs

@api_router.post("/faq")
async def ask_question(
    question: str,
    route_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    faq = Faq(
        question=question,
        route_id=route_id
    )
    
    await db.faq.insert_one(faq.model_dump())
    return {"success": True, "faq": faq.model_dump()}

@api_router.post("/faq/{faq_id}/answer")
async def answer_question(
    faq_id: str,
    answer: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ["marshal", "driver"]:
        raise HTTPException(status_code=403, detail="Only marshals and drivers can answer")
    
    result = await db.faq.update_one(
        {"id": faq_id},
        {
            "$set": {
                "answer": answer,
                "answered_by": current_user["name"]
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"success": True}

# ============== LEADERBOARD ==============

@api_router.get("/leaderboard")
async def get_leaderboard():
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).sort("points", -1).limit(50).to_list(50)
    return users

# ============== HEALTH & INIT ==============

@api_router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "bhubezi-api",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/snapshot")
async def get_snapshot():
    """Get complete app state for offline sync"""
    return {
        "users": await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100),
        "ranks": await db.ranks.find({}, {"_id": 0}).to_list(100),
        "routes": await db.routes.find({}, {"_id": 0}).to_list(100),
        "rank_statuses": await db.rank_statuses.find({}, {"_id": 0}).to_list(100),
        "pings": await db.pings.find({}, {"_id": 0}).sort("created_at", -1).to_list(100),
        "posts": await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(50),
        "faqs": await db.faq.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    }

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_database():
    """Initialize database with sample data"""
    # Check if already seeded
    existing = await db.ranks.find_one({})
    if existing:
        return {"message": "Database already seeded"}
    
    # Seed ranks
    ranks = [
        Rank(id="bree", name="Bree Street", location="Joburg CBD", category="CBD"),
        Rank(id="noord", name="Noord Street", location="Joburg CBD", category="CBD"),
        Rank(id="park", name="Park Station", location="Joburg CBD", category="CBD"),
        Rank(id="bara", name="Bara Rank", location="Soweto", category="Soweto"),
        Rank(id="dobsonville", name="Dobsonville", location="Soweto", category="Soweto"),
        Rank(id="alex", name="Alexandra", location="Alexandra", category="Alexandra")
    ]
    await db.ranks.insert_many([r.model_dump() for r in ranks])
    
    # Seed routes
    routes = [
        Route(id="bree-bara", origin_id="bree", destination_id="bara", fare=22, label="Bree → Bara"),
        Route(id="noord-dobsonville", origin_id="noord", destination_id="dobsonville", fare=24, label="Noord → Dobsonville"),
        Route(id="bree-alex", origin_id="bree", destination_id="alex", fare=18, label="Bree → Alex"),
        Route(id="park-bara", origin_id="park", destination_id="bara", fare=23, label="Park → Bara")
    ]
    await db.routes.insert_many([r.model_dump() for r in routes])
    
    # Seed sample users
    users = [
        {
            "id": "driver-baba-joe",
            "name": "Baba Joe",
            "phone": "0712345678",
            "role": "driver",
            "verified": True,
            "points": 1550,
            "vehicle": {"brand": "Toyota Quantum", "color": "White", "plate": "JZ 456 GP"},
            "current_route_id": "bree-bara",
            "occupancy": 9
        },
        {
            "id": "marshal-sis-thuli",
            "name": "Sis Thuli",
            "phone": "0723456789",
            "role": "marshal",
            "verified": True,
            "points": 1790
        }
    ]
    await db.users.insert_many(users)
    
    # Seed rank statuses
    statuses = [
        RankStatus(rank_id="bree", capacity="moving", load_estimate=48, marshal_name="Sis Thuli"),
        RankStatus(rank_id="bara", capacity="half_full", load_estimate=62, marshal_name="Baba Joe")
    ]
    await db.rank_statuses.insert_many([s.model_dump() for s in statuses])
    
    return {"message": "Database seeded successfully"}

# ============== APP SETUP ==============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def startup():
    logger.info("Bhubezi API started")
    # Auto-seed on first run
    try:
        existing = await db.ranks.find_one({})
        if not existing:
            logger.info("Seeding database...")
            # Seed ranks
            ranks = [
                {"id": "bree", "name": "Bree Street", "location": "Joburg CBD", "category": "CBD"},
                {"id": "noord", "name": "Noord Street", "location": "Joburg CBD", "category": "CBD"},
                {"id": "park", "name": "Park Station", "location": "Joburg CBD", "category": "CBD"},
                {"id": "bara", "name": "Bara Rank", "location": "Soweto", "category": "Soweto"},
                {"id": "dobsonville", "name": "Dobsonville", "location": "Soweto", "category": "Soweto"},
                {"id": "alex", "name": "Alexandra", "location": "Alexandra", "category": "Alexandra"}
            ]
            await db.ranks.insert_many(ranks)
            
            # Seed routes
            routes = [
                {"id": "bree-bara", "origin_id": "bree", "destination_id": "bara", "fare": 22, "label": "Bree → Bara"},
                {"id": "noord-dobsonville", "origin_id": "noord", "destination_id": "dobsonville", "fare": 24, "label": "Noord → Dobsonville"},
                {"id": "bree-alex", "origin_id": "bree", "destination_id": "alex", "fare": 18, "label": "Bree → Alex"},
                {"id": "park-bara", "origin_id": "park", "destination_id": "bara", "fare": 23, "label": "Park → Bara"}
            ]
            await db.routes.insert_many(routes)
            logger.info("Database seeded")
    except Exception as e:
        logger.error(f"Startup seeding failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
