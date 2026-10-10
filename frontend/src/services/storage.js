/**
 * Screening history. The backend is stateless, so completed screenings (real backend responses +
 * the recruiter's own status/notes) are kept in this browser's localStorage and nowhere else.
 */
const KEY = 'srs.screenings.v1';
const MAX = 100;
const listeners = new Set();

const read = () => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
let snapshot = read();

function commit(next) {
  snapshot = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); }
  catch {
    // quota: shed the heaviest field (raw resume text) from older records and retry once
    snapshot = next.map((s, i) => (i > 20 ? { ...s, screening: { ...s.screening, resume_text: '' } } : s));
    try { localStorage.setItem(KEY, JSON.stringify(snapshot)); } catch { /* in-memory copy still works */ }
  }
  listeners.forEach((l) => l());
}

export const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const getSnapshot = () => snapshot;

const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function addScreening({ filename, jobTitle, jobDescription, requiredExperienceYears, requiredDegree, screening }) {
  const record = {
    id: uid(), createdAt: new Date().toISOString(), filename, jobTitle: jobTitle || 'Untitled role',
    jobDescription, requiredExperienceYears, requiredDegree, screening, status: 'new', note: '', ml: null,
  };
  commit([record, ...snapshot].slice(0, MAX));
  return record;
}
export const updateScreening = (id, patch) => commit(snapshot.map((s) => (s.id === id ? { ...s, ...patch } : s)));
export const deleteScreening = (id) => commit(snapshot.filter((s) => s.id !== id));
export const clearScreenings = () => commit([]);
