import os

from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "anthropic/claude-haiku-4.5")
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
INVESTIGATIONS_DIR = os.getenv("INVESTIGATIONS_DIR", "investigations")

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://rhizolve:rhizolve@localhost:5432/rhizolve"
)
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
CLERK_AUTHORIZED_PARTIES = os.getenv(
    "CLERK_AUTHORIZED_PARTIES", "http://localhost:5173"
).split(",")

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "no-reply@rhizolve.app")

CLAUDE_CONTEXT_WINDOW_TOKENS = 200_000
COMPACTION_THRESHOLD = 0.8
