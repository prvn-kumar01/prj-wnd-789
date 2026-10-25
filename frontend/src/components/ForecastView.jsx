import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend, BarChart, Bar,
} from 'recharts';
import { Wind, Clock, Info, AlertTriangle } from 'lucide-react';
import { getLatestForecasts, getAccuracyAnalysis } from '../services/api';
import { useFetch, formatMW, formatDate, formatTime, formatDateTime } from '../hooks/useFetch';
import { LoadingState, ErrorState, KPICard, CustomTooltip } from './shared';

export default function ForecastView() {
  const { data: latestData, loading: l1, error: e1 } = useFetch(getLatestForecasts);
  const { data: accuracyData, loading: l2, error: e2 } = useFetch(getAccuracyAnalysis);
  const [selectedDate, setSelectedDate] = useState('');

  // Get unique dates from the forecast data
  const { dates, filteredData, stats } = useMemo(() => {
    if (!latestData?.data) return { dates: [], filteredData: [], stats: null };

    const allDates = [...new Set(
      latestData.data.map(d => d.startTime.split('T')[0])
    )].filter(d => d.startsWith('2026-01')).sort();

    const targetDate = selectedDate || allDates[0] || '';

    const filtered = latestData.data
      .filter(d => d.startTime.startsWith(targetDate))
      .map(d => ({
        ...d,
        timeLabel: formatTime(d.startTime),
        hour: new Date(d.startTime).getUTCHours(),
      }))
      .sort((a, b) => a.hour - b.hour);

    // Compute stats for selected day
    const generations = filtered.map(d => d.generation);
    const dayStats = generations.length > 0 ? {
      avg: Math.round(generations.reduce((a, b) => a + b, 0) / generations.length),
      max: Math.max(...generations),
      min: Math.min(...generations),
      total: Math.round(generations.reduce((a, b) => a + b, 0)),
    } : null;

    return { dates: allDates, filteredData: filtered, stats: dayStats };
  }, [latestData, selectedDate]);

  // Get MAE for confidence bands
  const mae = accuracyData?.summary?.mae || 0;

  // Add confidence bands to chart data
  const chartDataWithBands = useMemo(() => {
    return filteredData.map(d => ({
      ...d,
      upperBound: d.generation + mae,
      lowerBound: Math.max(0, d.generation - mae),
    }));
  }, [filteredData, mae]);

  if (l1 || l2) return <LoadingState message="Loading latest forecasts..." />;
  if (e1 || e2) return <ErrorState message={e1 || e2} />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>
          <Wind size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px', color: 'var(--accent-primary)' }} />
          Wind Generation Forecast
        </h2>
        <p>
          Latest available forecasts for day-ahead procurement decisions
        </p>
        <div className="page-header-meta">
          <span className="meta-badge info">⚡ {latestData?.count || 0} forecast periods</span>
          <span className="meta-badge warning">
            ±{formatMW(mae)} MW confidence range (based on MAE)
          </span>
        </div>
      </div>

      {/* Date Filter */}
      <div className="filter-bar">
        <span className="filter-label">Delivery Date:</span>
        <select
          className="filter-select"
          value={selectedDate || dates[0]}
          onChange={(e) => setSelectedDate(e.target.value)}
        >
          {dates.map(d => (
            <option key={d} value={d}>{formatDate(d + 'T00:00:00Z')}</option>
          ))}
        </select>
      </div>

      {/* Day KPIs */}
      {stats && (
        <div className="kpi-grid">
          <KPICard
            label="Average Forecast"
            value={formatMW(stats.avg)}
            unit="MW"
            subtext="Mean hourly generation"
            color="blue"
          />
          <KPICard
            label="Peak Generation"
            value={formatMW(stats.max)}
            unit="MW"
            subtext="Highest hour"
            color="green"
          />
          <KPICard
            label="Trough Generation"
            value={formatMW(stats.min)}
            unit="MW"
            subtext="Lowest hour"
            color="amber"
          />
          <KPICard
            label="Confidence Range"
            value={`±${formatMW(mae)}`}
            unit="MW"
            subtext="Based on historical MAE"
            color="purple"
          />
        </div>
      )}

      {/* Forecast Chart with Confidence Bands */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              Hourly Wind Forecast — {selectedDate || dates[0] || 'N/A'}
            </div>
            <div className="card-subtitle">
              Shaded area shows ±MAE confidence band
            </div>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartDataWithBands} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
              <defs>
                <linearGradient id="gradFc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="upperBound"
                name="Upper Bound"
                stroke="none"
                fill="url(#gradBand)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                name="Lower Bound"
                stroke="none"
                fill="transparent"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="generation"
                name="Forecast"
                stroke="#3b82f6"
                fill="url(#gradFc)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6', stroke: '#1e3a5f', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#60a5fa' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="insight-box">
          <AlertTriangle size={16} color="var(--accent-warning)" />
          <div className="insight-text">
            <strong>Procurement Guidance:</strong> For this delivery day, the forecast
            projects an average of <strong>{formatMW(stats?.avg)} MW</strong> wind generation.
            Based on historical accuracy, actual generation could range from{' '}
            <strong>{formatMW((stats?.avg || 0) - mae)} MW</strong> to{' '}
            <strong>{formatMW((stats?.avg || 0) + mae)} MW</strong>.
            Consider procuring thermal capacity to cover the downside risk scenario
            (lower bound).
          </div>
        </div>
      </div>

      {/* Hourly Table */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Hourly Forecast Detail</div>
            <div className="card-subtitle">
              All periods for selected delivery date
            </div>
          </div>
        </div>
        <div className="data-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Hour (UTC)</th>
                <th>Forecast (MW)</th>
                <th>Lower Bound (MW)</th>
                <th>Upper Bound (MW)</th>
                <th>Published At</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((d, i) => (
                <tr key={i}>
                  <td>{d.timeLabel}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {formatMW(d.generation)}
                  </td>
                  <td>{formatMW(Math.max(0, d.generation - mae))}</td>
                  <td>{formatMW(d.generation + mae)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(d.publishTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
