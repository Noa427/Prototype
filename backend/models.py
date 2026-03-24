from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    full_name: str
    email: str = Field(unique=True)
    hashed_password: str
    role: str = Field(default="client") # "admin" or "client"
    is_active: bool = Field(default=True)
    last_login: Optional[datetime] = None

from sqlalchemy import Column, JSON

class Deal(SQLModel, table=True):
    id: str = Field(primary_key=True)
    city: str
    district: Optional[str] = None
    property_type: str
    price: int
    surface: float
    price_per_m2: int
    dpe: str
    need_work: bool
    map_query: str
    gross_yield: float
    aevum_score: int
    url: str
    description: Optional[str] = None
    photos: List[str] = Field(default=[], sa_column=Column(JSON))
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Agency(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    location: str
    status: str = Field(default="active")
    last_activity: Optional[datetime] = None
