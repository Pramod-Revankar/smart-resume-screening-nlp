import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from './core';

/** Table on ≥md, stacked cards on mobile (via renderCard). columns: [{key,header,render,sort,align,className}] */
export function DataTable({ columns, rows, rowKey, onRowClick, renderCard, empty, defaultSort }) {
  const [sort, setSort] = useState(defaultSort || null);
  const sorted = (() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    return [...rows].sort((a, b) => { const x = col.sort(a), y = col.sort(b); return (x > y ? 1 : x < y ? -1 : 0) * (sort.dir === 'asc' ? 1 : -1); });
  })();
  if (!rows.length) return empty || null;
  const toggle = (c) => c.sort && setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'desc' }));
  const open = (r) => onRowClick?.(r);
  const keyDown = (e, r) => { if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(r); } };
  return (
    <>
      <div className="hidden md:block overflow-x-auto scroll-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              {columns.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cn('px-4 py-3 eyebrow !text-[10.5px] font-medium', c.align === 'right' && 'text-right', c.className)}>
                  {c.sort ? <button onClick={() => toggle(c)} className="inline-flex items-center gap-1 uppercase tracking-[0.12em] hover:text-text">{c.header}{sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</button> : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={rowKey(r)} tabIndex={onRowClick ? 0 : undefined} onClick={() => open(r)} onKeyDown={(e) => keyDown(e, r)}
                className={cn('border-b border-line/70 last:border-0 transition-colors', onRowClick && 'cursor-pointer hover:bg-sunken/60 focus-visible:bg-sunken/60')}>
                {columns.map((c) => <td key={c.key} className={cn('px-4 py-3.5 align-middle', c.align === 'right' && 'text-right', c.className)}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden divide-y divide-line/70">
        {sorted.map((r) => (
          <li key={rowKey(r)}>
            <button onClick={() => open(r)} className="block w-full px-4 py-4 text-left active:bg-sunken/60 min-h-12">{renderCard(r)}</button>
          </li>
        ))}
      </ul>
    </>
  );
}
