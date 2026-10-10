import { useEffect, useState } from 'react';
import { checkHealth } from '../services/api';

/** online: true | false | null (checking) — re-checks every 30s. */
export function useHealth() {
  const [online, setOnline] = useState(null);
  useEffect(() => {
    let alive = true;
    const run = () => checkHealth().then((r) => alive && setOnline(r.online));
    run();
    const t = setInterval(run, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return online;
}
