import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';

const INK = '#0d120f', LINE = '#e3e1d8', MUTED = '#8f968d';
const tickStyle = { fontSize: 11, fill: '#5f675f', fontFamily: 'var(--font-mono)' };
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #e3e1d8', boxShadow: '0 10px 30px -12px rgb(13 18 15 / .25)', fontSize: 12 }, cursor: { fill: 'rgb(13 18 15 / 0.04)' } };

const Frame = ({ height = 220, children, label }) => (
  <div style={{ height }} role="img" aria-label={label}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
);

export function ColumnChart({ data, x, y = 'count', colors, height, label, unit = '' }) {
  return (
    <Frame height={height} label={label}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={LINE} />
        <XAxis dataKey={x} tick={tickStyle} tickLine={false} axisLine={false} interval={0} />
        <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} />
        <Tooltip {...tip} formatter={(v) => [`${v}${unit}`, 'Candidates']} />
        <Bar dataKey={y} radius={[6, 6, 0, 0]} animationDuration={800}>{data.map((d, i) => <Cell key={i} fill={colors ? colors[i] : INK} />)}</Bar>
      </BarChart>
    </Frame>
  );
}

export function ActivityChart({ data, height, label }) {
  return (
    <Frame height={height} label={label}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
        <defs><linearGradient id="act" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8fbf1f" stopOpacity={0.45} /><stop offset="100%" stopColor="#c9f26b" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke={LINE} />
        <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} />
        <Tooltip {...tip} formatter={(v) => [v, 'Screenings']} />
        <Area type="monotone" dataKey="count" stroke={INK} strokeWidth={2} fill="url(#act)" animationDuration={900} dot={{ r: 2.5, fill: INK, strokeWidth: 0 }} />
      </AreaChart>
    </Frame>
  );
}

/** Horizontal bars: [[label, n], …] */
export function RankBars({ rows, color = INK, total, empty = 'No data yet' }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r[1]), 1);
  return (
    <ul className="space-y-3">
      {rows.map(([label, n]) => (
        <li key={label}>
          <div className="mb-1 flex items-baseline justify-between text-[13px]"><span className="font-medium">{label}</span><span className="tnum text-muted">{n}{total ? ` · ${Math.round((n / total) * 100)}%` : ''}</span></div>
          <div className="h-2 rounded-full bg-sunken"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(n / max) * 100}%`, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function CalibrationChart({ predicted, observed, height = 240 }) {
  const data = predicted.map((p, i) => ({ p: +(p * 100).toFixed(1), o: +(observed[i] * 100).toFixed(1) }));
  return (
    <Frame height={height} label="Calibration: predicted probability versus observed selection rate">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={LINE} />
        <XAxis dataKey="p" type="number" domain={[0, 100]} tick={tickStyle} tickLine={false} unit="%" />
        <YAxis type="number" domain={[0, 100]} tick={tickStyle} tickLine={false} axisLine={false} unit="%" />
        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke={MUTED} strokeDasharray="4 4" />
        <Tooltip {...tip} formatter={(v, n) => [`${v}%`, n === 'o' ? 'Observed rate' : 'Predicted']} labelFormatter={(l) => `Predicted ≈ ${l}%`} />
        <Line dataKey="o" stroke={INK} strokeWidth={2} dot={{ r: 3, fill: INK }} animationDuration={900} />
      </LineChart>
    </Frame>
  );
}
