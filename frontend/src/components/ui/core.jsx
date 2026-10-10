import { forwardRef, useEffect, useId, useRef } from 'react';
import { animate, motion, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertTriangle, Check, X } from 'lucide-react';

export const cn = (...a) => twMerge(clsx(a));

/* ───────── Button ───────── */
const BTN = {
  primary: 'bg-ink text-white hover:bg-ink-3 shadow-[0_1px_0_rgb(255_255_255/0.12)_inset]',
  accent: 'bg-lime text-ink hover:bg-[#d6f58a] font-semibold',
  secondary: 'bg-surface text-text border border-line-strong hover:bg-sunken',
  ghost: 'text-muted hover:text-text hover:bg-sunken',
  danger: 'bg-bad text-white hover:bg-[#a92f2f]',
  dark: 'bg-white/10 text-white border border-white/15 hover:bg-white/15',
};
const BTN_SIZE = { sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg', md: 'h-10 px-4 text-sm gap-2 rounded-xl', lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl' };
export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', className, loading, children, as: As = 'button', ...p }, ref) {
  return (
    <As ref={ref} className={cn('inline-flex items-center justify-center font-medium whitespace-nowrap select-none transition-colors duration-150 disabled:opacity-50 min-h-[2rem]', BTN[variant], BTN_SIZE[size], className)}
      {...(As === 'button' ? { type: p.type || 'button' } : {})} aria-busy={loading || undefined} {...p} disabled={p.disabled || loading}>
      {loading && <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />}
      {children}
    </As>
  );
});

/* ───────── Card / headers ───────── */
export const Card = ({ className, children, as: As = 'section', ...p }) => <As className={cn('card', className)} {...p}>{children}</As>;

export function SectionHeader({ eyebrow, title, description, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        {title && <h2 className="text-[17px] font-semibold tracking-tight text-text">{title}</h2>}
        {description && <p className="mt-1 text-sm text-muted max-w-prose">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="display text-[2.4rem] sm:text-5xl leading-[1.05] text-ink">{title}</h1>
        {description && <p className="mt-2 text-[15px] text-muted max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ───────── Badges ───────── */
const TONE = {
  ok: 'bg-ok-wash text-ok', warn: 'bg-warn-wash text-warn', bad: 'bg-bad-wash text-bad', info: 'bg-info-wash text-info',
  neutral: 'bg-sunken text-muted', lime: 'bg-lime text-ink', dark: 'bg-white/10 text-white',
};
export const Badge = ({ tone = 'neutral', className, children, icon: Icon }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', TONE[tone], className)}>
    {Icon && <Icon className="size-3" aria-hidden />}{children}
  </span>
);

const STATUS = { 'Strong Match': ['ok', 'Strong match'], 'Moderate Match': ['warn', 'Moderate match'], 'Weak Match': ['bad', 'Weak match'] };
export function StatusBadge({ recommendation, className }) {
  const [tone, label] = STATUS[recommendation] || ['neutral', recommendation];
  return (
    <Badge tone={tone} className={className}>
      <span className={cn('size-1.5 rounded-full', { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', neutral: 'bg-subtle' }[tone])} aria-hidden />{label}
    </Badge>
  );
}
const PIPE = { new: ['neutral', 'New'], shortlisted: ['ok', 'Shortlisted'], rejected: ['bad', 'Rejected'] };
export const PipelineBadge = ({ status }) => <Badge tone={PIPE[status]?.[0] || 'neutral'}>{PIPE[status]?.[1] || status}</Badge>;
export const PIPELINE_OPTIONS = [['new', 'New'], ['shortlisted', 'Shortlisted'], ['rejected', 'Rejected']];

/* ───────── Score ring ───────── */
export const TONE_HEX = { ok: '#17935a', warn: '#c98a1a', bad: '#d4504a', lime: '#c9f26b', info: '#3567d6' };
export function ScoreRing({ value, size = 180, stroke = 12, tone = 'ok', label, sublabel, track = 'rgb(255 255 255 / 0.1)', textClass = 'text-white', marker }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const dash = useTransform(mv, (v) => `${(Math.min(100, Math.max(0, v)) / 100) * c} ${c}`);
  const text = useTransform(mv, (v) => Math.round(v));
  useEffect(() => { if (reduce) { mv.set(value); return; } const ctl = animate(mv, value, { duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }); return () => ctl.stop(); }, [value, reduce, mv]);
  const angle = marker != null ? (marker / 100) * 2 * Math.PI - Math.PI / 2 : null;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label || 'Score'}: ${Math.round(value)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONE_HEX[tone] || tone} strokeWidth={stroke} strokeLinecap="round" style={{ strokeDasharray: dash }} />
      </svg>
      {angle != null && (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" aria-hidden>
          <line x1={size / 2 + (r - stroke) * Math.cos(angle)} y1={size / 2 + (r - stroke) * Math.sin(angle)} x2={size / 2 + (r + stroke * 0.9) * Math.cos(angle)} y2={size / 2 + (r + stroke * 0.9) * Math.sin(angle)} stroke="currentColor" strokeWidth="2" className={textClass} />
        </svg>
      )}
      <div className={cn('absolute inset-0 flex flex-col items-center justify-center', textClass)}>
        <div className="flex items-start leading-none"><motion.span className="display tnum" style={{ fontSize: size * 0.3 }}>{text}</motion.span><span className="display opacity-70" style={{ fontSize: size * 0.14, marginTop: size * 0.04 }}>%</span></div>
        {sublabel && <span className="mt-1.5 eyebrow !text-current opacity-60">{sublabel}</span>}
      </div>
    </div>
  );
}

/* ───────── Progress ───────── */
const BAR = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', ink: 'bg-ink', lime: 'bg-lime', info: 'bg-info', neutral: 'bg-subtle' };
export function ProgressBar({ value, tone = 'ink', className, track = 'bg-sunken', height = 'h-2', delay = 0 }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('w-full overflow-hidden rounded-full', track, height, className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={cn('h-full rounded-full', BAR[tone])} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] }} />
    </div>
  );
}

/* ───────── Stat ───────── */
export function Stat({ label, value, hint, tone, icon: Icon, className }) {
  const color = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[tone] || 'text-ink';
  return (
    <div className={cn('card p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between"><span className="eyebrow">{label}</span>{Icon && <Icon className="size-4 text-subtle" aria-hidden />}</div>
      <div className={cn('display tnum mt-3 text-[2.6rem] leading-none', color)}>{value}</div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </div>
  );
}

/* ───────── Skill badge ───────── */
export function SkillBadge({ children, state = 'neutral', className }) {
  const s = { matched: 'bg-ok-wash text-ok border-ok/20', missing: 'bg-bad-wash text-bad border-bad/20', neutral: 'bg-sunken text-text border-line' }[state];
  const Icon = state === 'matched' ? Check : state === 'missing' ? X : null;
  return <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[13px] font-medium', s, className)}>{Icon && <Icon className="size-3.5" aria-hidden />}{children}</span>;
}

/* ───────── Timeline ───────── */
export function Timeline({ items }) {
  return (
    <ol className="relative">
      {items.map((it, i) => (
        <li key={i} className="relative pl-8 pb-6 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-line-strong" aria-hidden />}
          <span className={cn('absolute left-0 top-1.5 size-[15px] rounded-full border-2 bg-surface', it.current ? 'border-ink bg-lime' : 'border-line-strong')} aria-hidden />
          {it.children}
        </li>
      ))}
    </ol>
  );
}

/* ───────── States ───────── */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-14', className)}>
      {Icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-sunken text-muted"><Icon className="size-5" aria-hidden /></div>}
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export const LoadingState = ({ rows = 3, className }) => (
  <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-12" style={{ opacity: 1 - i * 0.15 }} />)}
  </div>
);
export function ErrorState({ title = 'Something went wrong', message, onRetry, className }) {
  return (
    <div className={cn('rounded-2xl border border-bad/25 bg-bad-wash/60 p-5', className)} role="alert">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden />
        <div className="min-w-0 flex-1"><div className="font-semibold text-bad">{title}</div>{message && <p className="mt-1 text-sm text-text/80 break-words">{message}</p>}
          {onRetry && <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}</div>
      </div>
    </div>
  );
}

/* ───────── Tooltip (CSS-only, keyboard accessible) ───────── */
export const Tooltip = ({ text, children, side = 'top' }) => (
  <span className="group/tt relative inline-flex">
    {children}
    <span role="tooltip" className={cn('pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-normal normal-case tracking-normal text-white opacity-0 shadow-pop transition-opacity group-hover/tt:opacity-100 group-focus-within/tt:opacity-100', side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2')}>{text}</span>
  </span>
);

/* ───────── Modal & Drawer ───────── */
function useOverlay(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => ref.current?.querySelector('[data-autofocus],input,select,textarea,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  return ref;
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  const ref = useOverlay(open, onClose); const id = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn('relative w-full rounded-2xl bg-surface shadow-pop', width)}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 id={id} className="font-semibold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-sunken"><X className="size-5" /></button></div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </motion.div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'sm:max-w-xl' }) {
  const ref = useOverlay(open, onClose); const id = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <motion.aside ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className={cn('absolute right-0 top-0 flex h-full w-full flex-col bg-paper shadow-pop', width)}>
        <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div><h2 id={id} className="text-lg font-semibold">{title}</h2>{subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}</div>
          <button onClick={onClose} aria-label="Close panel" className="rounded-md p-1.5 text-muted hover:bg-sunken"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scroll-thin">{children}</div>
        {footer && <div className="border-t border-line bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </motion.aside>
    </div>
  );
}

/* ───────── Form fields ───────── */
export function Field({ label, hint, error, children, className, htmlFor }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-text">{label}</label>}
      {children}
      {error ? <p className="mt-1.5 text-xs text-bad" role="alert">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
const INPUT = 'w-full rounded-xl border bg-surface px-3.5 text-[15px] text-text placeholder:text-subtle transition-colors focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
export const Input = forwardRef(function Input({ className, invalid, ...p }, ref) {
  return <input ref={ref} className={cn(INPUT, 'h-11', invalid ? 'border-bad' : 'border-line-strong', className)} aria-invalid={invalid || undefined} {...p} />;
});
export const Textarea = forwardRef(function Textarea({ className, invalid, ...p }, ref) {
  return <textarea ref={ref} className={cn(INPUT, 'py-3 leading-relaxed resize-y', invalid ? 'border-bad' : 'border-line-strong', className)} aria-invalid={invalid || undefined} {...p} />;
});
export const Select = forwardRef(function Select({ className, invalid, children, ...p }, ref) {
  return <select ref={ref} className={cn(INPUT, 'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f675f%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-9', invalid ? 'border-bad' : 'border-line-strong', className)} {...p}>{children}</select>;
});
