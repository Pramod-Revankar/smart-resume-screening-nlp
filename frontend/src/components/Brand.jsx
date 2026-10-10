import { Link } from 'react-router-dom';
import { cn } from './ui';

export const Mark = ({ className = 'size-8' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden>
    <rect width="32" height="32" rx="9" fill="#C9F26B" />
    <path d="M9 21.5c0-2.2 1.8-3.5 4.4-3.5h5.2c1.2 0 2-.6 2-1.6s-.8-1.6-2-1.6h-7.6V9.8h7.6c3.2 0 5.4 1.9 5.4 4.6 0 2.6-1.9 4.5-4.9 4.5h-5.4c-1 0-1.5.4-1.5 1s.5 1 1.5 1H24v2.9H13.4C10.6 23.8 9 22.9 9 21.5Z" fill="#0D120F" />
  </svg>
);

export function Logo({ to = '/', dark = false, className }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Smart Resume Screening — home">
      <Mark />
      <span className={cn('leading-none', dark ? 'text-white' : 'text-ink')}>
        <span className="block text-[15px] font-semibold tracking-tight">Smart Resume</span>
        <span className="eyebrow !text-[10px] !tracking-[0.2em] opacity-60 !text-current">Screening</span>
      </span>
    </Link>
  );
}
