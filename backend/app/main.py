"""
FastAPI Backend - UK Wind Power Forecast Dashboard

Serves as the API layer between the React frontend and the Elexon BMRS
data source. Provides endpoints for:
  - Wind generation actuals (FUELHH dataset)
  - Wind generation forecasts (WINDFOR dataset)
  - Forecast accuracy analytics
  - Latest available forecasts for procurement decisions

Data is cached in-memory after first fetch to avoid repeated calls to
the Elexon API during a single server session.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from app.elexon_client import fetch_wind_actuals, fetch_wind_forecasts
from app.analytics import (
    compute_accuracy_metrics,
    get_latest_forecasts,
    get_forecast_versions,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory cache for the Elexon data
_cache: dict = {
    "actuals": None,
    "forecasts": None,
}


async def _ensure_data_loaded():
    """Load data from Elexon API if not already cached."""
    if _cache["actuals"] is None:
        logger.info("Loading wind actuals from Elexon API...")
        _cache["actuals"] = await fetch_wind_actuals()
        logger.info(f"Cached {len(_cache['actuals'])} actual records")

    if _cache["forecasts"] is None:
        logger.info("Loading wind forecasts from Elexon API...")
        _cache["forecasts"] = await fetch_wind_forecasts()
        logger.info(f"Cached {len(_cache['forecasts'])} forecast records")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load data on startup for faster first requests."""
    try:
        await _ensure_data_loaded()
        logger.info("Data pre-loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to pre-load data on startup: {e}")
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="UK Wind Power Forecast Dashboard API",
    description="API for viewing wind power generation forecasts and evaluating "
    "forecast accuracy for UK day-ahead electricity market decisions.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "actuals_loaded": _cache["actuals"] is not None,
        "forecasts_loaded": _cache["forecasts"] is not None,
        "actuals_count": len(_cache["actuals"]) if _cache["actuals"] else 0,
        "forecasts_count": len(_cache["forecasts"]) if _cache["forecasts"] else 0,
    }


@app.get("/api/actuals")
async def get_actuals():
    """
    Get actual wind generation data for January 2026.

    Returns half-hourly actual wind power generation from the FUELHH dataset,
    filtered for fuelType=WIND. Each record includes the settlement period
    start time and the generation value in MW.
    """
    await _ensure_data_loaded()
    return {
        "data": _cache["actuals"],
        "count": len(_cache["actuals"]),
        "dataset": "FUELHH",
        "fuel_type": "WIND",
        "period": "January 2026",
    }


@app.get("/api/forecasts")
async def get_forecasts():
    """
    Get all wind generation forecasts for January 2026.

    Returns all forecast records from the WINDFOR dataset. Multiple
    forecasts may exist for the same target hour, each with a different
    publishTime showing forecast evolution.
    """
    await _ensure_data_loaded()
    return {
        "data": _cache["forecasts"],
        "count": len(_cache["forecasts"]),
        "dataset": "WINDFOR",
        "period": "January 2026",
    }


@app.get("/api/forecasts/latest")
async def get_latest_forecast_view():
    """
    Get the latest available forecast for each target hour.

    For each target startTime, returns only the most recently published
    forecast. This represents the best available information for the
    procurement team when making day-ahead market decisions.
    """
    await _ensure_data_loaded()
    latest = get_latest_forecasts(_cache["forecasts"])
    return {
        "data": latest,
        "count": len(latest),
        "description": "Latest forecast per target hour for January 2026",
    }


@app.get("/api/forecasts/versions")
async def get_forecast_version_history(
    date: str = Query(
        ...,
        description="Target date in YYYY-MM-DD format",
        example="2026-01-15",
    )
):
    """
    Get all forecast versions for a specific target date.

    Shows how the forecast for a given day evolved over successive
    publishTimes. Useful for understanding forecast convergence and
    the lead time at which forecasts become reliable.
    """
    await _ensure_data_loaded()
    versions = get_forecast_versions(_cache["forecasts"], date)
    if not versions:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast data found for date {date}",
        )
    return {
        "data": versions,
        "count": len(versions),
        "target_date": date,
    }


@app.get("/api/accuracy")
async def get_accuracy_analysis():
    """
    Comprehensive forecast accuracy analysis for January 2026.

    Joins the latest forecast for each hour with actuals and computes:
    - Summary metrics: MAE, RMSE, MAPE, Bias, Correlation
    - Timeseries: hour-by-hour forecast vs actual comparison
    - Hourly profile: average error patterns by time of day
    - Daily summary: day-by-day accuracy breakdown
    - Error distribution: histogram of forecast errors
    """
    await _ensure_data_loaded()
    result = compute_accuracy_metrics(_cache["actuals"], _cache["forecasts"])
    return result


@app.get("/api/reload")
async def reload_data():
    """
    Force reload data from the Elexon API.
    Clears the cache and fetches fresh data.
    """
    _cache["actuals"] = None
    _cache["forecasts"] = None
    await _ensure_data_loaded()
    return {
        "status": "reloaded",
        "actuals_count": len(_cache["actuals"]),
        "forecasts_count": len(_cache["forecasts"]),
    }


# --- Serve Built Frontend SPA (Unified Single-Service Hosting) ---
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)

if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))
