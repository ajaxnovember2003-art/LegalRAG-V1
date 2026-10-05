/**
 * LegalRAG API Service
 *
 * Centralized API layer — every component uses this
 * instead of making direct HTTP calls.
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000, // pipeline can take time on first load
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * POST /api/query
 * Sends a legal question to the LegalRAG pipeline.
 */
export async function askLegalRAG(question) {
  const response = await api.post('/api/query', { question });
  return response.data;
}

/**
 * GET /api/health
 * Checks if the backend pipeline is loaded and ready.
 */
export async function healthCheck() {
  const response = await api.get('/api/health');
  return response.data;
}

/**
 * GET /api/statutes
 * Fetches all supported statutes with cataloged section counts.
 */
export async function getStatutes() {
  const response = await api.get('/api/statutes');
  return response.data;
}

/**
 * GET /api/statutes/:statuteCode/sections
 * Searches/browses real sections indexed from the official Gazette.
 */
export async function getStatuteSections(statuteCode = 'all', query = '', limit = 50, offset = 0) {
  const params = { limit, offset };
  if (query) params.q = query;
  const response = await api.get(`/api/statutes/${statuteCode}/sections`, { params });
  return response.data;
}

/**
 * GET /api/statutes/:statuteCode/sections/:sectionNumber
 * Gets detailed text and historical mapping for a specific section.
 */
export async function getSectionDetail(statuteCode, sectionNumber) {
  const response = await api.get(`/api/statutes/${statuteCode}/sections/${sectionNumber}`);
  return response.data;
}

/**
 * GET /api/statutes/mappings
 * Fetches verified historical concordance tables (IPC ↔ BNS, CrPC ↔ BNSS, IEA ↔ BSA).
 */
export async function getHistoricalMappings(statuteCode = null) {
  const params = statuteCode ? { statute_code: statuteCode } : {};
  const response = await api.get('/api/statutes/mappings', { params });
  return response.data;
}

export default api;

