from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    full_name: str
    email: str = Field(unique=True)
    hashed_password: str
    role: str = Field(default="client") # "admin" or "client"
    is_active: bool = Field(default=True)
    last_login: Optional[datetime] = None
    
    # Relationships
    alerts: List["Alert"] = Relationship(back_populates="user")

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

    # Relationships
    agency_id: Optional[int] = Field(default=None, foreign_key="agency.id")
    agency: Optional["Agency"] = Relationship(back_populates="deals")
    leads: List["Lead"] = Relationship(back_populates="deal")

class Agency(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    location: str
    status: str = Field(default="active")
    last_activity: Optional[datetime] = None
    
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

class Campaign(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    type: str # "email", "sms"
    status: str = Field(default="draft") # "draft", "scheduled", "sent", "failed"
    scheduled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
