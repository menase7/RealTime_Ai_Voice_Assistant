from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "Real-Time AI Voice Assistant"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/ai_voice"
    JWT_SECRET: str = "super-secret-key-change-in-production-phase-1"
    GEMINI_API_KEY: str = ""
    ASSEMBLYAI_API_KEY: str = ""
    
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def sanitize_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            # Normalize PostgreSQL scheme to asyncpg dialect
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            
            # Clean unsupported query parameters for asyncpg (e.g. channel_binding, sslmode)
            try:
                from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
                parsed = urlparse(v)
                qs = parse_qs(parsed.query)
                # Remove libpq parameters unsupported by asyncpg
                qs.pop("channel_binding", None)
                qs.pop("options", None)
                # Convert sslmode to ssl
                if "sslmode" in qs:
                    sslmode_val = qs.pop("sslmode")[0]
                    if sslmode_val in ("require", "verify-ca", "verify-full"):
                        qs["ssl"] = ["require"]
                elif "ssl" not in qs and "neon.tech" in (parsed.hostname or ""):
                    qs["ssl"] = ["require"]
                
                flat_qs = {k: val[0] if len(val) == 1 else val for k, val in qs.items()}
                v = urlunparse(parsed._replace(query=urlencode(flat_qs, doseq=True)))
            except Exception:
                # Fallback regex/string replacement
                import re
                v = re.sub(r'[?&]channel_binding=[^&]*', '', v)
                v = v.replace("sslmode=", "ssl=")
                if v.endswith("&") or v.endswith("?"):
                    v = v[:-1]
        return v


    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed.startswith("["):
                try:
                    return json.loads(v_trimmed)
                except Exception:
                    pass
            return [i.strip() for i in v_trimmed.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
