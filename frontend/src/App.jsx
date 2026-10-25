import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ForecastView from './components/ForecastView';
import AccuracyView from './components/AccuracyView';
import DailyBreakdown from './components/DailyBreakdown';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/forecasts" element={<ForecastView />} />
            <Route path="/accuracy" element={<AccuracyView />} />
            <Route path="/daily" element={<DailyBreakdown />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
