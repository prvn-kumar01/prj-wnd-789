"""
Analytics Service

Computes forecast accuracy metrics by joining WINDFOR forecasts with
FUELHH actuals on their target time, then calculating standard error
metrics used in energy forecasting evaluation.
"""

import pandas as pd
import numpy as np
from typing import Any


def compute_accuracy_metrics(
    actuals: list[dict], forecasts: list[dict]
) -> dict[str, Any]:
    """
    Join forecasts with actuals and compute comprehensive accuracy metrics.

    Strategy for joining:
    - Actuals (FUELHH) are at 30-min resolution. We aggregate to hourly
      by averaging each pair of half-hours into their parent hour.
    - Forecasts (WINDFOR) are at hourly resolution with multiple
      publish times. For each target hour, we use the LATEST forecast
      (most recent publishTime) to represent the "best available" forecast
      at decision time.

    Metrics computed:
    - MAE: Mean Absolute Error
    - RMSE: Root Mean Square Error
    - MAPE: Mean Absolute Percentage Error
    - Bias: Mean signed error (forecast - actual); positive = overforecast
    - Max Error: worst single-period deviation
    - Correlation: Pearson correlation between forecast and actual
    """
    if not actuals or not forecasts:
        return {
            "summary": {},
            "timeseries": [],
            "hourly_profile": [],
            "daily_summary": [],
            "error_distribution": [],
        }

    # --- Process Actuals ---
    df_actuals = pd.DataFrame(actuals)
    df_actuals["startTime"] = pd.to_datetime(df_actuals["startTime"])
    # Aggregate to hourly: floor to hour and take mean
    df_actuals["hour"] = df_actuals["startTime"].dt.floor("h")
    df_hourly_actuals = (
        df_actuals.groupby("hour")["generation"]
        .mean()
        .reset_index()
        .rename(columns={"generation": "actual_generation"})
    )

    # --- Process Forecasts ---
    df_forecasts = pd.DataFrame(forecasts)
    df_forecasts["startTime"] = pd.to_datetime(df_forecasts["startTime"])
    df_forecasts["publishTime"] = pd.to_datetime(df_forecasts["publishTime"])

    # Keep only the latest forecast for each target hour
    df_forecasts = df_forecasts.sort_values("publishTime")
    df_latest_forecasts = (
        df_forecasts.groupby("startTime")
        .last()
        .reset_index()[["startTime", "publishTime", "generation"]]
        .rename(columns={
            "startTime": "hour",
            "generation": "forecast_generation",
        })
    )

    # --- Join on hour ---
    df_merged = pd.merge(
        df_hourly_actuals, df_latest_forecasts, on="hour", how="inner"
    )

    if df_merged.empty:
        return {
            "summary": {},
            "timeseries": [],
            "hourly_profile": [],
            "daily_summary": [],
            "error_distribution": [],
        }

    # --- Compute errors ---
    df_merged["error"] = (
        df_merged["forecast_generation"] - df_merged["actual_generation"]
    )
    df_merged["abs_error"] = df_merged["error"].abs()
    df_merged["pct_error"] = (
        df_merged["abs_error"] / df_merged["actual_generation"] * 100
    )

    # --- Summary Metrics ---
    mae = float(df_merged["abs_error"].mean())
    rmse = float(np.sqrt((df_merged["error"] ** 2).mean()))
    mape = float(df_merged["pct_error"].mean())
    bias = float(df_merged["error"].mean())
    max_error = float(df_merged["abs_error"].max())

    # Correlation
    correlation = float(
        df_merged["forecast_generation"].corr(df_merged["actual_generation"])
    )

    avg_actual = float(df_merged["actual_generation"].mean())
    avg_forecast = float(df_merged["forecast_generation"].mean())
    total_periods = len(df_merged)

    summary = {
        "mae": round(mae, 1),
        "rmse": round(rmse, 1),
        "mape": round(mape, 2),
        "bias": round(bias, 1),
        "max_error": round(max_error, 1),
        "correlation": round(correlation, 4),
        "avg_actual_mw": round(avg_actual, 1),
        "avg_forecast_mw": round(avg_forecast, 1),
        "total_periods": total_periods,
        "mae_pct_of_avg": round(mae / avg_actual * 100, 2) if avg_actual else 0,
    }

    # --- Timeseries for charts ---
    df_merged_sorted = df_merged.sort_values("hour")
    timeseries = []
    for _, row in df_merged_sorted.iterrows():
        timeseries.append({
            "time": row["hour"].isoformat(),
            "actual": round(float(row["actual_generation"]), 1),
            "forecast": round(float(row["forecast_generation"]), 1),
            "error": round(float(row["error"]), 1),
            "abs_error": round(float(row["abs_error"]), 1),
            "pct_error": round(float(row["pct_error"]), 2),
        })

    # --- Hourly error profile (avg error by hour of day) ---
    df_merged["hour_of_day"] = df_merged["hour"].dt.hour
    hourly_profile = (
        df_merged.groupby("hour_of_day")
        .agg(
            avg_error=("error", "mean"),
            avg_abs_error=("abs_error", "mean"),
            avg_actual=("actual_generation", "mean"),
            avg_forecast=("forecast_generation", "mean"),
            count=("error", "count"),
        )
        .reset_index()
    )
    hourly_profile_list = []
    for _, row in hourly_profile.iterrows():
        hourly_profile_list.append({
            "hour": int(row["hour_of_day"]),
            "avg_error": round(float(row["avg_error"]), 1),
            "avg_abs_error": round(float(row["avg_abs_error"]), 1),
            "avg_actual": round(float(row["avg_actual"]), 1),
            "avg_forecast": round(float(row["avg_forecast"]), 1),
            "count": int(row["count"]),
        })

    # --- Daily summary ---
    df_merged["date"] = df_merged["hour"].dt.date
    daily_summary_df = (
        df_merged.groupby("date")
        .agg(
            daily_mae=("abs_error", "mean"),
            daily_bias=("error", "mean"),
            daily_avg_actual=("actual_generation", "mean"),
            daily_avg_forecast=("forecast_generation", "mean"),
            daily_max_error=("abs_error", "max"),
        )
        .reset_index()
    )
    daily_summary = []
    for _, row in daily_summary_df.iterrows():
        daily_summary.append({
            "date": str(row["date"]),
            "mae": round(float(row["daily_mae"]), 1),
            "bias": round(float(row["daily_bias"]), 1),
            "avg_actual": round(float(row["daily_avg_actual"]), 1),
            "avg_forecast": round(float(row["daily_avg_forecast"]), 1),
            "max_error": round(float(row["daily_max_error"]), 1),
        })

    # --- Error distribution (binned) ---
    error_values = df_merged["error"].values
    bins = np.linspace(error_values.min() - 50, error_values.max() + 50, 25)
    hist, bin_edges = np.histogram(error_values, bins=bins)
    error_distribution = []
    for i in range(len(hist)):
        error_distribution.append({
            "bin_start": round(float(bin_edges[i]), 0),
            "bin_end": round(float(bin_edges[i + 1]), 0),
            "bin_label": f"{int(bin_edges[i])} to {int(bin_edges[i + 1])}",
            "count": int(hist[i]),
        })

    return {
        "summary": summary,
        "timeseries": timeseries,
        "hourly_profile": hourly_profile_list,
        "daily_summary": daily_summary,
        "error_distribution": error_distribution,
    }


def get_latest_forecasts(forecasts: list[dict]) -> list[dict]:
    """
    From all available forecasts, extract the latest forecast for each
    target startTime. This represents what the procurement team would
    see when making their day-ahead purchasing decision.
    """
    if not forecasts:
        return []

    df = pd.DataFrame(forecasts)
    df["startTime"] = pd.to_datetime(df["startTime"])
    df["publishTime"] = pd.to_datetime(df["publishTime"])

    # Keep the latest publishTime for each startTime
    df = df.sort_values("publishTime")
    df_latest = df.groupby("startTime").last().reset_index()

    result = []
    for _, row in df_latest.sort_values("startTime").iterrows():
        result.append({
            "startTime": row["startTime"].isoformat(),
            "publishTime": row["publishTime"].isoformat(),
            "generation": int(row["generation"]),
        })

    return result


def get_forecast_versions(forecasts: list[dict], target_date: str) -> list[dict]:
    """
    Get all forecast versions for a specific target date, showing how
    the forecast evolved as new data became available. Useful for
    understanding forecast convergence.
    """
    if not forecasts:
        return []

    df = pd.DataFrame(forecasts)
    df["startTime"] = pd.to_datetime(df["startTime"])
    df["publishTime"] = pd.to_datetime(df["publishTime"])

    # Filter to target date
    target = pd.Timestamp(target_date)
    mask = df["startTime"].dt.date == target.date()
    df_filtered = df[mask].sort_values(["startTime", "publishTime"])

    result = []
    for _, row in df_filtered.iterrows():
        result.append({
            "startTime": row["startTime"].isoformat(),
            "publishTime": row["publishTime"].isoformat(),
            "generation": int(row["generation"]),
        })

    return result
