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
    role: str = Field(default="agent")  # "admin" | "gérant" | "agent"
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
    photos: List[str] = Field(default_factory=list, sa_column=Column(JSON))
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
    post_sale_steps: List["PostSaleStep"] = Relationship(back_populates="deal")

class Notification(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    deal_id: Optional[int] = Field(default=None, foreign_key="deal.id")
    alert_id: Optional[int] = Field(default=None, foreign_key="alert.id")
    message: str
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: User = Relationship(back_populates="notifications")
    deal: Optional[Deal] = Relationship()

class Agency(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    location: str
    status: str = Field(default="active")
    last_activity: Optional[datetime] = None
    license_key: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)
    last_heartbeat: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    sms_api_key: Optional[str] = None
    email_api_key: Optional[str] = None

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
    status: str = Field(default="new")  # new|contacted|qualified|rdv_pris|offre|signé|lost
    notes: Optional[str] = None
    score_chaleur: int = Field(default=5)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    signature_request_id: Optional[str] = None
    signature_status: str = Field(default="none")  # none|pending|signed|refused|expired

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
    day_overrides: Optional[str] = Field(default=None)  # JSON: {"5": {"start_time": "09:00", "end_time": "17:00", ...}}


class CalendarBlock(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    block_type: str  # "vacation" | "appointment" | "personal"
    start_datetime: datetime
    end_datetime: datetime
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChannelAccount(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    channel_type: str  # "whatsapp" | "sms" | "email"
    credentials_encrypted: str
    phone_number: Optional[str] = None
    email_address: Optional[str] = None
    is_active: bool = Field(default=True)
    last_sync: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChannelConversation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    channel_account_id: int = Field(foreign_key="channelaccount.id")
    external_id: str = Field(index=True)
    sender_identity: str
    lead_id: Optional[int] = Field(default=None, foreign_key="lead.id")
    messages: List[dict] = Field(default_factory=list, sa_column=Column(JSON))
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="active")  # "active" | "lead_created" | "closed"
    agent_takeover: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Campaign(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    type: str # "email", "sms"
    status: str = Field(default="draft") # "draft", "scheduled", "sent", "failed"
    scheduled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Mandate(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    mandate_number: int
    mandate_type: str  # vente|recherche|location|gestion
    property_address: str
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    start_date: datetime
    end_date: datetime
    exclusive: bool = Field(default=False)
    commission_rate: float = Field(default=3.0)
    status: str = Field(default="actif")  # actif|expiré|annulé|vendu
    document_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Rental(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    deal_id: Optional[int] = Field(default=None, foreign_key="deal.id")
    tenant_name: str
    tenant_email: str
    tenant_phone: Optional[str] = None
    monthly_rent: float
    charges: float = Field(default=0.0)
    deposit: float = Field(default=0.0)
    start_date: datetime
    end_date: Optional[datetime] = None
    notice_period_days: int = Field(default=90)
    status: str = Field(default="active")  # active|terminated
    created_at: datetime = Field(default_factory=datetime.utcnow)

    payments: List["RentalPayment"] = Relationship(back_populates="rental")
    documents: List["RentalDocument"] = Relationship(back_populates="rental")


class RentalPayment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    rental_id: int = Field(foreign_key="rental.id", index=True)
    month: datetime  # Premier jour du mois concerné
    amount: float
    paid_date: Optional[datetime] = None
    status: str = Field(default="pending")  # pending|paid|late|partial
    reminder_sent_dates: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    rental: Optional[Rental] = Relationship(back_populates="payments")


class RentalDocument(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    rental_id: int = Field(foreign_key="rental.id", index=True)
    doc_type: str  # inventory_in|inventory_out|receipt
    file_path: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    rental: Optional[Rental] = Relationship(back_populates="documents")


class PostSaleStep(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deal.id", index=True)
    step_name: str
    step_order: int  # 1 à 7
    due_date: datetime
    completed_date: Optional[datetime] = None
    status: str = Field(default="pending")  # pending|completed|overdue
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    deal: Optional["Deal"] = Relationship(back_populates="post_sale_steps")
