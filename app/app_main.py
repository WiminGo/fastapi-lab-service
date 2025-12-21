from http.client import responses

from fastapi import FastAPI, HTTPException, Query, Path, status
from typing import Optional, List
from sqlalchemy import create_engine, select, func, asc, desc
from sqlalchemy.orm import declarative_base, mapped_column, Mapped, Session
from sqlalchemy.types import Integer, String, DateTime
from datetime import datetime, timezone,date, time
from pydantic import BaseModel, Field, field_validator, ConfigDict
import re
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os


DATABASE_URL = "sqlite:///lab.db"
engine = create_engine(DATABASE_URL, echo=False, future=True)
Base = declarative_base()

class Service(Base):
    __tablename__ = "services"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[str] = mapped_column(String, nullable=True)
    service_type: Mapped[str] = mapped_column(String, nullable=False)
    provider_name: Mapped[str] = mapped_column(String, nullable=True)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[int] = mapped_column(Integer)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(engine)
app = FastAPI(title="Service PROvision")

class ServiceBase(BaseModel):
    title: str = Field(..., min_length=3, description="Заголовок задачи (минимум 3 символа)")
    details: Optional[str] = Field(None, description="Дополнительные сведения")
    service_type: str = Field(..., description="Тип услуги")
    provider_name: str = Field(..., description="Укажите ваше имя")
    phone: str = Field(..., description="Номер телофона, чтобы клиент мог с вами связаться")
    price: int = Field(..., description="Цена услуги")
    available_at: datetime = Field(..., description="Дата оказании услуги")

    @field_validator("available_at")
    @classmethod
    def ensure_timezone(cls, v: datetime) -> datetime:
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)

    @field_validator("title")
    @classmethod
    def title_must_not_be_all_whitespace(cls, v):
        if not v.strip():
            raise ValueError("Заголовок не должен состоять только из пробелов")
        return v

class ServiceCreate(ServiceBase):
    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone_update(cls, v):
        if v is None:
            return v  # Пропускаем, если не передан
        if not isinstance(v, str):
            raise ValueError("Номер телефона должен быть строкой")
        if not v.strip():
            raise ValueError("Номер телефона не может быть пустым")
        cleaned = re.sub(r"[^\d+]", "", v.strip())
        if not re.match(r"^\+\d{7,15}$", cleaned):
            raise ValueError(
                "Номер телефона должен быть в международном формате: +<код><номер>, например +491234567890"
            )
        return cleaned

class ServiceUpdate(ServiceBase):
    title: Optional[str] = Field(None, min_length=3)
    details: Optional[str] = None
    service_type: Optional[str] = None
    provider_name: Optional[str] = None
    phone: Optional[str] = None
    price: Optional[int] = None
    available_at: Optional[datetime] = None

    @field_validator("title", mode='before')
    @classmethod
    def title_not_empty_if_provided(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Заголовок не должен состоять только из пробелов")
        return v

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone_update(cls, v):
        if v is None:
            return v  # Пропускаем, если не передан
        if not isinstance(v, str):
            raise ValueError("Номер телефона должен быть строкой")
        if not v.strip():
            raise ValueError("Номер телефона не может быть пустым")
        cleaned = re.sub(r"[^\d+]", "", v.strip())
        if not re.match(r"^\+\d{7,15}$", cleaned):
            raise ValueError(
                "Номер телефона должен быть в международном формате: +<код><номер>, например +491234567890"
            )
        return cleaned

class ServiceResponse(ServiceBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}

@app.get("/services", response_model=List[ServiceResponse], tags=["services"])
def list_items(
    q: Optional[str] = Query(None, description="Поиск по подстроке в title и details (без учёта регистра)"),
    service_type: Optional[str] = Query(None, description="Фильтр по типу предоставляемых услуг"),
    max_price: Optional[int] = Query(None, description="Фильтр услуг со стоимостью меньше указанной"),
    min_price: Optional[int] = Query(None, description="Фильтр услуг со стоимостью больше указанной"),
    available_at: Optional[date] = Query(None, description="Поиск по дате"),
    order: str = Query("asc", description="Порядок: asc или desc"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    if order not in {"asc", "desc"}:
        raise HTTPException(
            status_code=400,
            detail="Порядок сортировки должен быть 'asc' или 'desc'"
        )

    with Session(engine) as session:
        stmt = select(Service)

        if q:
            ql = f"%{q.lower()}%"
            stmt = stmt.where(
                (func.lower(Service.title).like(ql)) |
                ((Service.details.is_not(None)) & (func.lower(Service.details).like(ql)))
            )

        if service_type is not None:
            stmt = stmt.where(Service.service_type == service_type)
        if max_price is not None:
            stmt = stmt.where(Service.price <= max_price)
        if min_price is not None:
            stmt = stmt.where(Service.price >= min_price)
        if available_at is not None:
            start_dt = datetime.combine(available_at, time.min, tzinfo=timezone.utc)
            end_dt = datetime.combine(available_at, time.max, tzinfo=timezone.utc)
            stmt = stmt.where(Service.available_at >= start_dt, Service.available_at <= end_dt)

        stmt = stmt.order_by(asc(Service.price) if order == "asc" else desc(Service.price))
        stmt = stmt.offset(offset).limit(limit)

        return session.scalars(stmt).all()

@app.get("/services/{service_id}", response_model=ServiceResponse, tags=["services"])
def get_service(service_id: int = Path(ge=1)):
    with Session(engine) as session:
        service = session.get(Service, service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Услуга не найдена")
        return service

@app.post("/services", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED,tags=["services"])
def create_service(service: ServiceCreate):
        obj = Service(
            title=service.title,
            details=service.details,
            service_type=service.service_type,
            provider_name=service.provider_name,
            phone=service.phone,
            price=service.price,
            available_at=service.available_at
        )

        with Session(engine) as session:
            session.add(obj)
            session.commit()
            session.refresh(obj)
            return obj


@app.patch("/services/{service_id}", response_model=ServiceResponse, tags=["services"])
def update_service(service_id: int = Path(ge=1), service: ServiceUpdate = ...):
    with Session(engine) as session:
        obj = session.get(Service, service_id)
        if not obj:
            raise HTTPException(status_code=404, detail="Услуга не найдена")

        update_data = service.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(obj, key, value)

        session.commit()
        session.refresh(obj)
        return obj

@app.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["services"])
def delete_service(service_id: int = Path(ge=1)):
    with Session(engine) as session:
        obj = session.get(Service, service_id)
        if not obj:
            raise HTTPException(status_code=404, detail="Услуга не найдена")
        session.delete(obj)
        session.commit()
        return



