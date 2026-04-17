from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
import uuid

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    full_name: str
    email: str = Field(unique=True)
    hashed_password: str
    role: str = Field(default="client") # "admin", "client", or "commercial"
    is_active: bool = Field(default=True)
    last_login: Optional[datetime] = None
    alert_threshold: int = Field(default=8)
    agency_id: Optional[int] = Field(default=None, foreign_key="agency.id")
    
    # Relationships
    alerts: List["Alert"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="user")

from sqlalchemy import Column, JSON, ForeignKey

class Deal(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    is_active: bool = Field(default=True)
    city: str | None = Field(default=None)
    district: Optional[str] = None
    property_type: str | None = Field(default=None)
    price: int | None = Field(default=None)
    surface: float | None = Field(default=None)
    price_per_m2: int | None = Field(default=None)
    dpe: str | None = Field(default=None)
    need_work: bool | None = Field(default=None)
    map_query: str | None = Field(default=None)
    gross_yield: float | None = Field(default=None)
    estimated_rent: float | None = Field(default=None)
    aevum_score: int | None = Field(default=None)
    url: str
    description: Optional[str] = None
    photos: List[str] = Field(default=[], sa_column=Column(JSON))
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Champs géocodage & enrichissement
    street_number: Optional[str] = None
    street: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    amenities: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # Champs verticale automobile
    vertical: str = Field(default="immo")  # "immo" | "auto"
    brand: Optional[str] = None
    model_name: Optional[str] = None
    mileage: Optional[int] = None
    year: Optional[int] = None

    # Relationships
    agency_id: Optional[int] = Field(default=None, foreign_key="agency.id")
    agency: Optional["Agency"] = Relationship(back_populates="deals")
    leads: List["Lead"] = Relationship(back_populates="deal")

class Notification(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    deal_id: int = Field(foreign_key="deal.id")
    alert_id: Optional[int] = Field(default=None, foreign_key="alert.id")
    message: str
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="notifications")
    deal: Deal = Relationship()

class Agency(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    location: str
    status: str = Field(default="active")
    last_activity: Optional[datetime] = None
    license_key: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)
    last_heartbeat: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    # Relationships
    deals: List[Deal] = Relationship(back_populates="agency")

class Lead(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    full_name: str
    email: str
    phone: Optional[str] = None
    budget: int
    apport: int
    delay: str
    status: str = Field(default="new") # "new", "contacted", "qualified", "lost"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    deal_id: int = Field(foreign_key="deal.id")
    deal: Deal = Relationship(back_populates="leads")
    assigned_to: Optional[int] = Field(default=None, foreign_key="user.id")

class Alert(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    query: str
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    min_surface: Optional[float] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="alerts")

class DealHistory(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deal.id")
    price: int | None = Field(default=None)
    available: bool
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    deal: Optional[Deal] = Relationship()

class CalendarConfig(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    work_days: str = Field(default="1,2,3,4,5")   # CSV: 1=lun … 7=dim
    start_time: str = Field(default="09:00")
    end_time: str = Field(default="18:00")
    slot_duration: int = Field(default=30)          # minutes
    lunch_start: str = Field(default="12:00")
    lunch_end: str = Field(default="13:00")
    excluded_dates: str = Field(default="")         # CSV YYYY-MM-DD
    calendar_url: Optional[str] = None              # iCal / Google link


class Campaign(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    type: str # "email", "sms"
    status: str = Field(default="draft") # "draft", "scheduled", "sent", "failed"
    scheduled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
