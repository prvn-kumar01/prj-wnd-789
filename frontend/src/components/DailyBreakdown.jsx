import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { BarChart3, Info } from 'lucide-react';
import { getAccuracyAnalysis } from '../services/api';
import { useFetch, formatMW, formatDate } from '../hooks/useFetch';
import { LoadingState, ErrorState, CustomTooltip } from './shared';

export default function DailyBreakdown() {
  const { data, loading, error } = useFetch(getAccuracyAnalysis);

  const chartData = useMemo(() => {
    if (!data?.daily_summary) return [];
    return data.daily_summary.map(d => ({
      ...d,
      dateLabel: formatDate(d.date + 'T00:00:00Z'),
    }));
  }, [data]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data?.daily_summary?.length) return <ErrorState message="No daily data" />;

  // Find best and worst days
  const sorted = [...data.daily_summary].sort((a, b) => a.mae - b.mae);
  const bestDay = sorted[0];
  const worstDay = sorted[sorted.length - 1];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>
          <BarChart3 size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px', color: 'var(--accent-secondary)' }} />
          Daily Breakdown
        </h2>
        <p>
          Day-by-day forecast performance across January 2026
        </p>
        <div className="page-header-meta">
          <span className="meta-badge success">
            Best: {formatDate(bestDay.date + 'T00:00:00Z')} (MAE: {formatMW(bestDay.mae)} MW)
          </span>
          <span className="meta-badge warning">
            Worst: {formatDate(worstDay.date + 'T00:00:00Z')} (MAE: {formatMW(worstDay.mae)} MW)
          </span>
        </div>
      </div>

      {/* Daily Forecast vs Actual */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Daily Average Generation: Forecast vs Actual</div>
            <div className="card-subtitle">
              Comparing daily mean forecast with daily mean actual generation
            </div>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar
                dataKey="avg_actual"
                name="Actual"
                fill="#10b981"
                radius={[3, 3, 0, 0]}
                opacity={0.8}
              />
              <Bar
                dataKey="avg_forecast"
                name="Forecast"
                fill="#3b82f6"
                radius={[3, 3, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily MAE and Bias */}
      <div className="chart-grid-2" style={{ marginTop: '24px' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Daily MAE Trend</div>
              <div className="card-subtitle">
                Mean absolute error by day
              </div>
            </div>
          </div>
          <div className="chart-container-sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10 }}
                  interval={2}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="mae"
                  name="Daily MAE"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6, fill: '#60a5fa' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Daily Bias Trend</div>
              <div className="card-subtitle">
                Positive = overforecast, Negative = underforecast
              </div>
            </div>
          </div>
          <div className="chart-container-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10 }}
                  interval={2}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="bias"
                  name="Daily Bias"
                  radius={[3, 3, 0, 0]}
                  opacity={0.8}
                >
                  {chartData.map((entry, idx) => (
                    <rect
                      key={idx}
                      fill={entry.bias >= 0 ? '#f59e0b' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Table */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Daily Summary Table</div>
            <div className="card-subtitle">
              Complete day-by-day breakdown
            </div>
          </div>
        </div>
        <div className="data-table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Avg Actual (MW)</th>
                <th>Avg Forecast (MW)</th>
                <th>MAE (MW)</th>
                <th>Bias (MW)</th>
                <th>Max Error (MW)</th>
              </tr>
            </thead>
            <tbody>
              {data.daily_summary.map((d, i) => (
                <tr key={i}>
                  <td>{formatDate(d.date + 'T00:00:00Z')}</td>
                  <td>{formatMW(d.avg_actual)}</td>
                  <td>{formatMW(d.avg_forecast)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {formatMW(d.mae)}
                  </td>
                  <td className={d.bias >= 0 ? '' : 'positive'}>
                    {d.bias > 0 ? '+' : ''}{formatMW(d.bias)}
                  </td>
                  <td style={{ color: 'var(--accent-warning)' }}>
                    {formatMW(d.max_error)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="insight-box" style={{ marginTop: '24px' }}>
        <Info size={16} color="var(--accent-primary)" />
        <div className="insight-text">
          <strong>Analysis Summary:</strong> The daily MAE varies across January 2026,
          indicating that forecast accuracy is not constant — it depends on weather
          conditions. Days with rapidly changing wind patterns tend to have higher
          forecast errors. The procurement team can use these historical patterns to
          calibrate their risk margins on a day-by-day basis.
        </div>
      </div>
    </div>
  );
}
