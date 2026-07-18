import { useEffect, useRef, useCallback } from "react";

export function useGameLoop(
  callback: (delta: number) => void,
  active: boolean,
  intervalMs: number
) {
  const callbackRef = useRef(callback);
  const lastTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - (lastTimeRef.current || now);
      lastTimeRef.current = now;
      callbackRef.current(delta);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, intervalMs]);
}
