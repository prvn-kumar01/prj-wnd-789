/**
 * API Service
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function fetchJSON(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getHealthStatus() {
  return fetchJSON('/api/health');
}

export async function getActuals() {
  return fetchJSON('/api/actuals');
}

export async function getForecasts() {
  return fetchJSON('/api/forecasts');
}

export async function getLatestForecasts() {
  return fetchJSON('/api/forecasts/latest');
}

export async function getForecastVersions(date) {
  return fetchJSON(`/api/forecasts/versions?date=${date}`);
}

export async function getAccuracyAnalysis() {
  return fetchJSON('/api/accuracy');
}
