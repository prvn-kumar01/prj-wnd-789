import { AlertCircle } from 'lucide-react';

export function LoadingState({ message = 'Loading data from Elexon BMRS...' }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="error-container">
      <AlertCircle size={32} />
      <p>{message || 'Failed to load data. Please try again.'}</p>
    </div>
  );
}

export function KPICard({ label, value, unit, subtext, color = 'blue' }) {
  return (
    <div className={`kpi-card ${color} fade-in`}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {subtext && <div className="kpi-subtext">{subtext}</div>}
    </div>
  );
}

export function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="custom-tooltip">
      <div className="label">{formatter ? formatter(label) : label}</div>
      {payload.map((entry, idx) => (
        <div className="item" key={idx}>
          <span className="dot" style={{ background: entry.color }} />
          <span>{entry.name}: </span>
          <span className="value">
            {typeof entry.value === 'number'
              ? Math.round(entry.value).toLocaleString()
              : entry.value}{' '}
            MW
          </span>
        </div>
      ))}
    </div>
  );
}
