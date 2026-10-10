import { useSyncExternalStore } from 'react';
import { getSnapshot, subscribe } from '../services/storage';

export function useScreenings() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function useScreening(id) {
  const all = useScreenings();
  return all.find((s) => s.id === id) || null;
}
