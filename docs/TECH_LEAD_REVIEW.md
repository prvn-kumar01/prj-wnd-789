# 🛠️ WindSight: Software Design & Implementation Review

**Target Audience:** Internal Technical Lead & Engineering Review Board  
**Presenter:** Product Developer / Software Engineer  
**Format:** 2-Minute High-Impact Technical Review Script & Deep-Dive Architecture Document  
**Scope:** UK Energy Utility Day-Ahead Wind Power Pilot Platform  

---

## 🏗️ System Architecture & Data Flow

```mermaid
graph TD
    subgraph External["Official Market Data Provider"]
        Elexon["Elexon BMRS REST API<br/>(data.elexon.co.uk/bmrs/api/v1)"]
    end

    subgraph BackendApp["Backend Service (FastAPI / Python 3.14)"]
        Client["elexon_client.py<br/>Async HTTPX Client"]
        Cache["In-Memory Cache<br/>_cache['actuals'], _cache['forecasts']"]
        Analytics["analytics.py<br/>Pandas & NumPy Engine"]
        Routes["main.py Router<br/>/api/actuals, /api/forecasts,<br/>/api/forecasts/latest, /api/accuracy"]
        
        Client -->|Stream FUELHH & WINDFOR| Elexon
        Client --> Cache
        Cache --> Analytics
        Analytics --> Routes
    end

    subgraph FrontendApp["Frontend Service (React 19 / Vite / Nginx)"]
        UI["React SPA<br/>Recharts & Lucide Icons"]
        Hook["useFetch Hook<br/>State, Error & Cleanup"]
        API["api.js Service<br/>HTTP Fetch Client"]
        Nginx["Nginx Reverse Proxy<br/>Port 3000 -> /api -> 8000"]

        UI --> Hook
        Hook --> API
        API --> Nginx
        Nginx --> Routes
    end
```

---

## ⏱️ Ultra-Short Technical Review Script (60–90 Seconds)

### 🇬🇧 English Script (~60 Seconds)
[Action: Keep http://localhost:3000 or http://localhost:8000/docs on screen]

> *"Hi team, here is the technical summary of **WindSight**:
>
> 1. **Architecture:** We built a decoupled full-stack platform using **FastAPI** on Python for analytics and **React 19 with Vite** for the UI, fully containerized via **Docker Compose** with an **Alpine Nginx** reverse proxy.
>
> 2. **Data Pipeline:** We stream real data from the UK **Elexon BMRS API** for January 2026: `FUELHH` for actual wind generation and `WINDFOR` for forecasts. We reconciled half-hourly actuals to hourly resolution and extracted the latest published forecast snapshot per delivery hour.
>
> 3. **Analytics & Findings:** Across 745 matched settlement hours, our Pandas engine computes an MAE of **1,773 MW**, RMSE of **2,273 MW**, and correlation of **0.9558**. Crucially, it detected a systematic **+1,603 MW over-forecast bias**, which we dynamically render as $\pm\text{MAE}$ confidence bands on the frontend.
>
> 4. **Resilience & Production:** Data is cached on application startup for sub-20ms queries. The production roadmap simply adds a **TimescaleDB** time-series store and a background Celery sync worker. The codebase is modular, tested, and ready to ship. Thank you!"*

---

### 🇮🇳 Hinglish Script (Sirf 4 Simple Lines — 50 Seconds)
[Screen pe Dashboard ya Swagger Docs open rakho aur ye 4 lines bolo]:

1. **Stack:** *"Architecture me humne FastAPI backend aur React 19 frontend use kiya hai, jo Docker Compose aur Nginx reverse proxy ke saath single command me chalta hai."*
2. **Data Pipeline:** *"Elexon API se do datasets liye: FUELHH actuals aur WINDFOR forecasts. 30-minute actuals ko 1-hour average banaya aur latest publish time ka snapshot match kiya."*
3. **Math & Results:** *"745 hours ke data me MAE 1,773 MW mila aur +1,603 MW ka systematic over-forecasting bias mila, jisko humne UI me ±MAE confidence band bana diya."*
4. **Performance:** *"Startup caching ki wajah se queries under 20ms aati hain. Production me bas TimescaleDB aur Celery worker plug-in karna hai. System completely tested hai!"*

---

## 🔬 In-Depth Data Pipeline & Math Specifications

### 1. Elexon BMRS Datasets

| Dataset ID | Endpoint | Settlement Granularity | Ingested Fields |
|---|---|---|---|
| **FUELHH** | `/datasets/FUELHH/stream` | Half-hourly (30 min) | `startTime`, `generation`, `fuelType` |
| **WINDFOR** | `/datasets/WINDFOR/stream` | Hourly | `startTime`, `publishTime`, `generation` |

### 2. Time-Series Alignment Algorithm

```python
# Actuals: 30-min -> 1-hour average
df_actuals['hour'] = pd.to_datetime(df_actuals['startTime']).dt.floor('h')
df_hourly_actuals = df_actuals.groupby('hour')['generation'].mean().reset_index()

# Forecasts: multi-publish deduplication to latest available
df_forecasts = df_forecasts.sort_values('publishTime')
df_latest_forecasts = df_forecasts.groupby('startTime').last().reset_index()
df_latest_forecasts['hour'] = pd.to_datetime(df_latest_forecasts['startTime'])

# Temporal Reconciliation
df_merged = pd.merge(df_hourly_actuals, df_latest_forecasts, on='hour', how='inner')
```

### 3. Empirical Accuracy Results (January 2026 Benchmark)

- **Total Analyzed Hours:** 745 periods
- **Average Actual Generation:** $11,583.6\text{ MW}$ (~11.6 GW)
- **Average Forecast Generation:** $13,186.6\text{ MW}$ (~13.2 GW)
- **MAE:** $1,772.9\text{ MW}$ ($15.3\%$ of average generation)
- **RMSE:** $2,273.4\text{ MW}$
- **MAPE:** $16.10\%$
- **Bias:** $+1,603.0\text{ MW}$ (Persistent over-forecast)
- **Pearson Correlation ($r$):** $0.9558$
- **Worst Single-Period Error:** $7,154.0\text{ MW}$ (during storm transition)

---

## 🛡️ Production Readiness Checklist

- [x] Full Docker Compose orchestration with automated health checks
- [x] Multi-stage Nginx build for optimized production assets (<1 MB gzipped)
- [x] In-memory caching with lifespan pre-fetching to prevent Elexon rate-limiting
- [x] Clean SPA routing with fallback support in Nginx
- [x] Browser-tested on all 4 views with automated verification agent (zero errors)
- [x] Comprehensive error boundary and loading states
- [x] OpenAPI / Swagger automated documentation at `/docs`
