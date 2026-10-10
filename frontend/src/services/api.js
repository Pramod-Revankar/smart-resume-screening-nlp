/**
 * All backend access lives here — components never contain URLs.
 * Base URL comes from VITE_API_BASE_URL.
 */
import axios from 'axios';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const http = axios.create({ baseURL: API_BASE_URL, timeout: 60_000 });

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {}, network = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.network = network;
  }
}

/** FastAPI returns `detail` as a string, or as a list of {loc,msg} for validation errors. */
function parseDetail(detail) {
  if (typeof detail === 'string') return { message: detail, fieldErrors: {} };
  if (Array.isArray(detail)) {
    const fieldErrors = {};
    const parts = detail.map((d) => {
      const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
      const msg = String(d.msg || 'Invalid value').replace(/^Value error, /, '');
      if (field && typeof field === 'string') fieldErrors[field] = msg;
      return field ? `${String(field).replace(/_/g, ' ')}: ${msg}` : msg;
    });
    return { message: parts.join(' · '), fieldErrors };
  }
  return { message: 'Request failed', fieldErrors: {} };
}

function toApiError(err) {
  if (err instanceof ApiError) return err;
  if (axios.isCancel?.(err)) return new ApiError('Cancelled', { status: -1 });
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return new ApiError(`Cannot reach the screening API at ${API_BASE_URL}. Is the backend running?`, { network: true });
    }
    const { message, fieldErrors } = parseDetail(err.response.data?.detail);
    return new ApiError(message, { status: err.response.status, fieldErrors });
  }
  return new ApiError(err?.message || 'Unexpected error');
}

const wrap = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (e) {
    throw toApiError(e);
  }
};

export const checkHealth = async () => {
  try {
    const { data } = await http.get('/', { timeout: 5000 });
    return { online: data?.status === 'active' };
  } catch {
    return { online: false };
  }
};

export const getModelMeta = wrap(async () => (await http.get('/model/meta')).data);

/** Parse a resume only (no job). */
export const uploadResume = wrap(async (file) => {
  const form = new FormData();
  form.append('file', file);
  return (await http.post('/resume/upload', form)).data;
});

/** Skill match of an existing skill list against a job description. */
export const matchJob = wrap(async (jobDescription, resumeSkills) =>
  (await http.post('/job/match', { job_description: jobDescription, resume_skills: resumeSkills })).data);

/** Structured ML prediction. Throws ApiError with `fieldErrors` for invalid input. */
export const predictCandidate = wrap(async (candidate) => (await http.post('/model/predict', candidate)).data);

/** Screen a resume from already-extracted text. */
export const screenResumeText = wrap(async ({ resumeText, jobDescription, requiredExperienceYears, requiredDegree }) =>
  (await http.post('/analysis/screen', {
    resume_text: resumeText,
    job_description: jobDescription,
    required_experience_years: Number(requiredExperienceYears),
    required_degree: requiredDegree,
  })).data);

/**
 * Screen an uploaded resume. Uses the NDJSON streaming endpoint so `onStage` fires as each
 * REAL server stage completes (received → extracted → skills → … → done). No simulated delays.
 */
export async function screenResume({ file, jobDescription, requiredExperienceYears, requiredDegree, onStage, signal }) {
  const form = new FormData();
  form.append('file', file);
  form.append('job_description', jobDescription);
  form.append('required_experience_years', String(requiredExperienceYears));
  form.append('required_degree', requiredDegree);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/analysis/screen-upload-stream`, { method: 'POST', body: form, signal });
  } catch (e) {
    if (e?.name === 'AbortError') throw new ApiError('Cancelled', { status: -1 });
    throw new ApiError(`Cannot reach the screening API at ${API_BASE_URL}. Is the backend running?`, { network: true });
  }
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch { /* not json */ }
    const { message, fieldErrors } = parseDetail(body?.detail);
    throw new ApiError(message || `Request failed (${res.status})`, { status: res.status, fieldErrors });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final = null;
  const handle = (line) => {
    if (!line.trim()) return;
    const evt = JSON.parse(line);
    if (evt.error) throw new ApiError(evt.error, { status: evt.status || 500 });
    onStage?.(evt.stage, evt);
    if (evt.stage === 'done') final = evt;
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      handle(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  handle(buffer);
  if (!final) throw new ApiError('The server closed the connection before finishing.');
  return { filename: final.filename, screening: final.screening };
}
