import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis,
  BarChart, Bar, Legend, AreaChart, Area, ReferenceLine,
} from 'recharts';
import { Target, Info, TrendingUp } from 'lucide-react';
import { getAccuracyAnalysis } from '../services/api';
import { useFetch, formatMW } from '../hooks/useFetch';
import { LoadingState, ErrorState, KPICard, CustomTooltip } from './shared';

export default function AccuracyView() {
  const { data, loading, error } = useFetch(getAccuracyAnalysis);

  const scatterData = useMemo(() => {
    if (!data?.timeseries) return [];
    // Sample for scatter to avoid overplotting
    return data.timeseries
      .filter((_, i) => i % 2 === 0)
      .map(d => ({
        actual: d.actual,
        forecast: d.forecast,
      }));
  }, [data]);

  if (loading) return <LoadingState message="Computing accuracy metrics..." />;
  if (error) return <ErrorState message={error} />;
  if (!data?.summary) return <ErrorState message="No accuracy data" />;

  const s = data.summary;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>
          <Target size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px', color: 'var(--accent-tertiary)' }} />
          Forecast Accuracy Analysis
        </h2>
        <p>
          Quantitative evaluation of wind forecast performance — January 2026
        </p>
      </div>

      {/* Accuracy KPIs */}
      <div className="kpi-grid">
        <KPICard
          label="MAE"
          value={formatMW(s.mae)}
          unit="MW"
          subtext={`${s.mae_pct_of_avg}% of avg generation`}
          color="blue"
        />
        <KPICard
          label="RMSE"
          value={formatMW(s.rmse)}
          unit="MW"
          subtext="Root mean square error"
          color="purple"
        />
        <KPICard
          label="MAPE"
          value={s.mape?.toFixed(2)}
          unit="%"
          subtext="Mean absolute % error"
          color="amber"
        />
        <KPICard
          label="Correlation"
          value={s.correlation?.toFixed(4)}
          unit=""
          subtext={s.correlation > 0.95 ? 'Strong positive' : 'Moderate positive'}
          color="green"
        />
        <KPICard
          label="Bias"
          value={(s.bias > 0 ? '+' : '') + formatMW(s.bias)}
          unit="MW"
          subtext={s.bias > 0 ? 'Overforecasting' : 'Underforecasting'}
          color={s.bias > 0 ? 'amber' : 'green'}
        />
        <KPICard
          label="Max Single Error"
          value={formatMW(s.max_error)}
          unit="MW"
          subtext="Worst single-period deviation"
          color="amber"
        />
      </div>

      {/* Scatter Plot: Forecast vs Actual */}
      <div className="chart-grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Forecast vs Actual Scatter</div>
              <div className="card-subtitle">
                Ideal: all points on the 45° diagonal line
              </div>
            </div>
          </div>
          <div className="chart-container-sm">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis
                  type="number"
                  dataKey="actual"
                  name="Actual"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  label={{ value: 'Actual (MW)', position: 'bottom', offset: -5, style: { fontSize: 11, fill: 'var(--text-muted)' } }}
                />
                <YAxis
                  type="number"
                  dataKey="forecast"
                  name="Forecast"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  label={{ value: 'Forecast (MW)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--text-muted)' } }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="custom-tooltip">
                        <div className="item">
                          <span>Actual: </span>
                          <span className="value">{formatMW(payload[0]?.value)} MW</span>
                        </div>
                        <div className="item">
                          <span>Forecast: </span>
                          <span className="value">{formatMW(payload[1]?.value)} MW</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData} fill="#3b82f6" opacity={0.5} r={3} />
                {/* Perfect forecast reference line */}
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: 25000, y: 25000 },
                  ]}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Error Distribution</div>
              <div className="card-subtitle">
                Histogram of forecast errors (forecast − actual)
              </div>
            </div>
          </div>
          <div className="chart-container-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.error_distribution || []}
                margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis
                  dataKey="bin_label"
                  tick={{ fontSize: 9 }}
                  interval={2}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="custom-tooltip">
                        <div className="label">{payload[0]?.payload?.bin_label} MW</div>
                        <div className="item">
                          <span>Count: </span>
                          <span className="value">{payload[0]?.value} periods</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
                <ReferenceLine x={0} stroke="#ef4444" strokeDasharray="3 3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Error Profile */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Accuracy by Time of Day</div>
            <div className="card-subtitle">
              Average error and absolute error by hour of day (UTC)
            </div>
          </div>
        </div>
        <div className="chart-container-sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.hourly_profile || []}
              margin={{ top: 10, right: 20, bottom: 5, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11 }}
                tickFormatter={(h) => `${h}:00`}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip formatter={(h) => `${h}:00 UTC`} />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <ReferenceLine y={0} stroke="rgba(148,163,184,0.3)" />
              <Bar
                dataKey="avg_error"
                name="Avg Error (Bias)"
                fill="#3b82f6"
                radius={[3, 3, 0, 0]}
                opacity={0.7}
              />
              <Bar
                dataKey="avg_abs_error"
                name="Avg Abs Error (MAE)"
                fill="#8b5cf6"
                radius={[3, 3, 0, 0]}
                opacity={0.7}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="insight-box success">
          <TrendingUp size={16} color="var(--accent-success)" />
          <div className="insight-text">
            <strong>Time-of-Day Pattern:</strong> Examine which hours show higher forecast
            errors. Persistent patterns (e.g., larger errors during ramp-up/ramp-down
            periods) can inform the procurement team to apply larger safety margins
            during those specific hours.
          </div>
        </div>
      </div>
    </div>
  );
}
