"""
Configuration and settings for SatQuery AI.
"""

from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = BASE_DIR / "outputs"
CACHE_DIR = BASE_DIR / "cache"
WEB_DIR = BASE_DIR / "satquery" / "web"

OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseModel):
    APP_NAME: str = "SatQuery AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # STAC Endpoints
    PLANETARY_COMPUTER_STAC: str = "https://planetarycomputer.microsoft.com/api/stac/v1"
    AWS_EARTH_SEARCH_STAC: str = "https://earth-search.aws.element84.com/v1"
    
    # Defaults
    DEFAULT_RESOLUTION_METERS: float = 10.0
    DEFAULT_MAX_CLOUD_COVER: float = 20.0
    SIMULATION_GRID_SIZE: int = 256


settings = Settings()
