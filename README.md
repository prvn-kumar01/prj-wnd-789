# WindSight — UK Wind Power Forecast Dashboard

A full-stack web application for UK energy utility procurement teams to view wind generation forecasts and evaluate forecast accuracy for day-ahead electricity market decisions.

> **Note:** This project was built with the assistance of AI tools (Google Gemini / Antigravity IDE).

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Docker Compose                       │
│                                                        │
│  ┌──────────────┐         ┌──────────────────────────┐ │
│  │   Frontend    │◄───────►│     Backend (FastAPI)    │ │
│  │  React + Vite │         │                          │ │
│  │  Port: 3000   │         │  • /api/actuals          │ │
│  │               │         │  • /api/forecasts        │ │
│  │  Pages:       │         │  • /api/forecasts/latest │ │
│  │  - Dashboard  │         │  • /api/accuracy         │ │
│  │  - Forecast   │         │                          │ │
│  │  - Accuracy   │         │  Data: Elexon BMRS API   │ │
│  │  - Daily      │         │  (FUELHH + WINDFOR)      │ │
│  └──────────────┘         └──────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
assessment/
├── docker-compose.yml          # Orchestrates frontend + backend
├── README.md                   # This file
│
├── docs/                       # Assessment presentation & review docs
│   ├── CLIENT_PITCH_SCRIPT.md  # 5-min client pitch script & demo cues
│   └── TECH_LEAD_REVIEW.md     # 5-min tech lead review & math specs
│
├── backend/                    # Python FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt        # Python dependencies
│   └── app/
│       ├── __init__.py
│       ├── main.py             # FastAPI app, endpoints, CORS, caching
│       ├── elexon_client.py    # Elexon BMRS API client (FUELHH, WINDFOR)
│       └── analytics.py        # Forecast accuracy metrics (MAE, RMSE, etc.)
│
└── frontend/                   # React + Vite frontend
    ├── Dockerfile
    ├── nginx.conf              # Nginx config for SPA + API proxy
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx            # React entry point
        ├── App.jsx             # Root component with routing
        ├── index.css           # Design system & global styles
        ├── services/
        │   └── api.js          # Backend API client
        ├── hooks/
        │   └── useFetch.js     # Custom hooks & utilities
        └── components/
            ├── Sidebar.jsx     # Navigation sidebar
            ├── shared.jsx      # Reusable components (KPI cards, etc.)
            ├── Dashboard.jsx   # Overview: forecast vs actual + KPIs
            ├── ForecastView.jsx # Latest forecast with confidence bands
            ├── AccuracyView.jsx # Accuracy metrics & analysis
            └── DailyBreakdown.jsx # Day-by-day performance
```

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose

### Run with Docker (recommended)

```bash
docker-compose up --build
```

Then open:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/docs

### Run Locally (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

## 🌐 Deployed Application

- **Live App:** [TODO: Add Vercel/Heroku URL]

## 📊 Features

### 1. Dashboard
- KPI cards: MAE, RMSE, Bias, Average Generation
- Forecast vs Actual overlay chart for all of January 2026
- Error trend over time
- Error pattern by time of day

### 2. Forecast View
- Day-by-day forecast browser with date selector
- Hourly generation forecast chart with ±MAE confidence bands
- Procurement guidance with risk range
- Detailed hourly table

### 3. Forecast Accuracy
- Comprehensive metrics: MAE, RMSE, MAPE, Correlation, Bias
- Scatter plot: Forecast vs Actual (with ideal 45° line)
- Error distribution histogram
- Hourly error profile (which hours have worst accuracy)

### 4. Daily Breakdown
- Daily average forecast vs actual bar chart
- Daily MAE trend
- Daily bias trend
- Complete summary table with best/worst day highlights

## 🔌 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check & data status |
| `GET /api/actuals` | Wind generation actuals (FUELHH, January 2026) |
| `GET /api/forecasts` | All wind forecasts (WINDFOR, January 2026) |
| `GET /api/forecasts/latest` | Latest forecast per target hour |
| `GET /api/forecasts/versions?date=YYYY-MM-DD` | Forecast version history |
| `GET /api/accuracy` | Full accuracy analysis with metrics |
| `GET /api/reload` | Force reload data from Elexon |

## 📐 Technical Decisions

1. **Data Resolution**: FUELHH provides 30-minute actuals; WINDFOR provides hourly forecasts. Actuals are aggregated to hourly by averaging each pair of half-hours for a fair comparison.

2. **Forecast Selection**: When multiple forecasts exist for the same target hour (published at different times), we use the latest (most recent publishTime) as it represents the best available information at decision time.

3. **Caching**: Data from Elexon is cached in-memory after first fetch to avoid redundant API calls during a single server session.

4. **Confidence Bands**: The ±MAE band on the forecast chart gives procurement teams a practical range for risk-aware decision making.

## 📦 Data Source

- **Elexon BMRS API** (Balancing Mechanism Reporting Service)
  - FUELHH dataset: Half-hourly actual generation by fuel type
  - WINDFOR dataset: Wind generation forecasts
  - Period: January 2026
  - API docs: https://bmrs.elexon.co.uk/api-documentation
