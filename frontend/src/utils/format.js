export const pct = (n, d = 0) => `${Number(n).toFixed(d)}%`;
export const titleCase = (s = '') => s.replace(/\b\w/g, (c) => c.toUpperCase());
export const SKILL_DISPLAY = {
  sql: 'SQL', mysql: 'MySQL', postgresql: 'PostgreSQL', mongodb: 'MongoDB', nosql: 'NoSQL', fastapi: 'FastAPI', aws: 'AWS', gcp: 'GCP',
  html: 'HTML', css: 'CSS', php: 'PHP', javascript: 'JavaScript', typescript: 'TypeScript', nlp: 'NLP', llm: 'LLM', 'node.js': 'Node.js',
  'next.js': 'Next.js', 'ci/cd': 'CI/CD', 'rest api': 'REST API', 'power bi': 'Power BI', 'scikit-learn': 'scikit-learn', opencv: 'OpenCV',
  pytorch: 'PyTorch', tensorflow: 'TensorFlow', xgboost: 'XGBoost', 'c++': 'C++', 'c#': 'C#', graphql: 'GraphQL', github: 'GitHub',
  frontend: 'Frontend', backend: 'Backend', 'full stack': 'Full stack',
};
export const skillLabel = (s) => SKILL_DISPLAY[s] || titleCase(s);

export function months(m) {
  const n = Math.round(m);
  if (n <= 0) return '0 months';
  const y = Math.floor(n / 12), r = n % 12;
  const parts = [];
  if (y) parts.push(`${y} yr${y > 1 ? 's' : ''}`);
  if (r) parts.push(`${r} mo`);
  return parts.join(' ');
}
export const fileSize = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
export const dateShort = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const dateTime = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return dateShort(iso);
};

/** Tone for a recommendation / score. */
export const toneOf = (rec) => (rec === 'Strong Match' ? 'ok' : rec === 'Moderate Match' ? 'warn' : 'bad');
export const toneOfScore = (s) => (s >= 80 ? 'ok' : s >= 60 ? 'warn' : 'bad');
export const candidateName = (rec) => rec.screening?.resume_analysis?.candidate?.name || rec.filename.replace(/\.[^.]+$/, '');
