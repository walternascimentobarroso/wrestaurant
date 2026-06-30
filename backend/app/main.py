from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    auth,
    checklists,
    health,
    home,
    menu,
    payables,
    products,
    purchases,
    sales,
    settings as settings_routes,
    stock,
    suppliers,
    sync,
    tables,
)
from app.config import settings
from app.database import SessionLocal
from app.services.seed import init_db, seed_database


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    with SessionLocal() as db:
        seed_database(db)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(home.router)
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(settings_routes.router, prefix="/api")
app.include_router(menu.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(tables.router, prefix="/api")
app.include_router(sales.router, prefix="/api")
app.include_router(stock.router, prefix="/api")
app.include_router(purchases.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(payables.router, prefix="/api")
app.include_router(checklists.router, prefix="/api")
app.include_router(sync.router, prefix="/api")

