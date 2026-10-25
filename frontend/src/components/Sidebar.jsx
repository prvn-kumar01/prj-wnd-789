import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wind, BarChart3, Target, Zap } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={22} color="#fff" />
        </div>
        <div className="sidebar-logo-text">
          <h1>WindSight</h1>
          <span>Forecast Analytics</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Analytics</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>

        <NavLink
          to="/forecasts"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Wind size={18} />
          Forecast View
        </NavLink>

        <NavLink
          to="/accuracy"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Target size={18} />
          Forecast Accuracy
        </NavLink>

        <NavLink
          to="/daily"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={18} />
          Daily Breakdown
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-badge">
          Data: January 2026
        </div>
        <p style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginTop: '8px',
          lineHeight: '1.4',
        }}>
          Source: Elexon BMRS
        </p>
      </div>
    </aside>
  );
}
