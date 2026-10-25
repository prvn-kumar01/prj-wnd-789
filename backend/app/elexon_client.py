"""
Elexon BMRS API Client

Fetches wind power actuals (FUELHH) and forecasts (WINDFOR) from the
Elexon Balancing Mechanism Reporting Service API for January 2026.
"""

import httpx
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

# January 2026 date range
JAN_2026_START = "2026-01-01T00:00:00Z"
JAN_2026_END = "2026-02-01T00:00:00Z"


async def fetch_wind_actuals(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> list[dict]:
    """
    Fetch actual wind generation data from the FUELHH dataset.
    Filters for fuelType=WIND only.

    The FUELHH dataset provides half-hourly (30-min) actual generation
    by fuel type. Each record contains:
      - startTime: beginning of the 30-minute settlement period
      - generation: actual MW generated
      - settlementPeriod: 1-48 within the settlement day
      - settlementDate: the settlement date
    """
    url = f"{ELEXON_BASE_URL}/datasets/FUELHH/stream"
    params = {
        "publishDateTimeFrom": date_from or JAN_2026_START,
        "publishDateTimeTo": date_to or JAN_2026_END,
        "fuelType": "WIND",
    }

    logger.info(f"Fetching wind actuals: {params}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    logger.info(f"Fetched {len(data)} wind actual records")
    return data


async def fetch_wind_forecasts(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> list[dict]:
    """
    Fetch wind generation forecasts from the WINDFOR dataset.

    The WINDFOR dataset provides hourly wind generation forecasts
    published multiple times per day. Each record contains:
      - startTime: the target hour being forecast
      - publishTime: when the forecast was issued
      - generation: forecast MW generation
    """
    url = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"
    params = {
        "publishDateTimeFrom": date_from or JAN_2026_START,
        "publishDateTimeTo": date_to or JAN_2026_END,
    }

    logger.info(f"Fetching wind forecasts: {params}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    logger.info(f"Fetched {len(data)} wind forecast records")
    return data
