"""
Database connection, session management, and table initialization.
Uses SQLite for local, offline-first reliability.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# For SQLite, check_same_thread=False is needed for multi-threaded FastAPI workers
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for yielding request-scoped database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables in SQLite database if they do not exist."""
    from app.models import orm_models  # Ensure models are imported
    Base.metadata.create_all(bind=engine)
