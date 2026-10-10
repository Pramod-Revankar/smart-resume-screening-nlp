import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s.slice(-3), { id, message, tone }]);
    setTimeout(() => dismiss(id), tone === 'bad' ? 7000 : 4000);
  }, [dismiss]);
  const Icon = { ok: CheckCircle2, bad: AlertTriangle, info: Info };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.tone] || Info;
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-pop">
                <I className={`mt-0.5 size-4 shrink-0 ${t.tone === 'bad' ? 'text-[#ff8a80]' : 'text-lime'}`} aria-hidden />
                <span className="flex-1">{t.message}</span>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-white/50 hover:text-white"><X className="size-4" /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
