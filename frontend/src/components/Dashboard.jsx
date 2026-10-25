import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { getAccuracyAnalysis } from '../services/api';
import { useFetch, formatMW, formatDate, formatTime } from '../hooks/useFetch';
import { LoadingState, ErrorState, KPICard, CustomTooltip } from './shared';

export default function Dashboard() {
  const { data, loading, error } = useFetch(getAccuracyAnalysis);

  const chartData = useMemo(() => {
    if (!data?.timeseries) return [];
    // Sample to avoid overplotting: show every 2nd point for the overview
    return data.timeseries.map((d, i) => ({
      ...d,
      timeLabel: formatDate(d.time) + ' ' + formatTime(d.time),
      shortLabel: i % 24 === 0 ? formatDate(d.time) : '',
    }));
  }, [data]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data?.summary) return <ErrorState message="No data available" />;

  const s = data.summary;
  const biasDirection = s.bias > 0 ? 'overforecasting' : 'underforecasting';

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Wind Power Dashboard</h2>
        <p>
          National wind generation overview for January 2026 — Forecast vs Actuals
        </p>
        <div className="page-header-meta">
          <span className="meta-badge info">📊 {s.total_periods} data points</span>
          <span className="meta-badge success">🎯 {s.correlation > 0.95 ? 'High' : 'Moderate'} Correlation: {s.correlation}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          label="Mean Absolute Error"
          value={formatMW(s.mae)}
          unit="MW"
          subtext={`${s.mae_pct_of_avg}% of average generation`}
          color="blue"
        />
        <KPICard
          label="Root Mean Square Error"
          value={formatMW(s.rmse)}
          unit="MW"
          subtext="Penalizes large errors more"
          color="purple"
        />
        <KPICard
          label="Forecast Bias"
          value={(s.bias > 0 ? '+' : '') + formatMW(s.bias)}
          unit="MW"
          subtext={`Systematic ${biasDirection}`}
          color={s.bias > 0 ? 'amber' : 'green'}
        />
        <KPICard
          label="Avg Actual Generation"
          value={formatMW(s.avg_actual_mw)}
          unit="MW"
          subtext={`Forecast avg: ${formatMW(s.avg_forecast_mw)} MW`}
          color="green"
        />
      </div>

      {/* Forecast vs Actual Chart */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Forecast vs Actual Generation</div>
            <div className="card-subtitle">Half-hourly comparison across January 2026</div>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <defs>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 10 }}
                interval={Math.floor(chartData.length / 10)}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#10b981"
                fill="url(#gradActual)"
                strokeWidth={1.5}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="#3b82f6"
                fill="url(#gradForecast)"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="insight-box">
          <Info size={16} color="var(--accent-primary)" />
          <div className="insight-text">
            <strong>Key Insight:</strong> The forecast generally tracks actual generation well
            (correlation: {s.correlation}), but shows a mean bias of{' '}
            <strong>{s.bias > 0 ? '+' : ''}{formatMW(s.bias)} MW</strong> ({biasDirection}).
            The procurement team should consider this systematic offset when
            making day-ahead purchase decisions. The MAE of <strong>{formatMW(s.mae)} MW</strong>{' '}
            represents approximately <strong>{s.mae_pct_of_avg}%</strong> of average generation.
          </div>
        </div>
      </div>

      {/* Error Over Time */}
      <div className="chart-grid-2" style={{ marginTop: '24px' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Forecast Error Over Time</div>
              <div className="card-subtitle">
                Positive = overforecast, Negative = underforecast
              </div>
            </div>
          </div>
          <div className="chart-container-sm">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <defs>
                  <linearGradient id="gradError" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 10 }}
                  interval={Math.floor(chartData.length / 6)}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="error"
                  name="Error"
                  stroke="#f59e0b"
                  fill="url(#gradError)"
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Error by Time of Day</div>
              <div className="card-subtitle">
                Average forecast error by hour (UTC)
              </div>
            </div>
          </div>
          <div className="chart-container-sm">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.hourly_profile || []}
                margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
              >
                <defs>
                  <linearGradient id="gradHourly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}`}
                />
                <Tooltip content={<CustomTooltip formatter={(h) => `${h}:00 UTC`} />} />
                <Area
                  type="monotone"
                  dataKey="avg_error"
                  name="Avg Error"
                  stroke="#8b5cf6"
                  fill="url(#gradHourly)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#8b5cf6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
