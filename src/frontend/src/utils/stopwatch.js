import { useEffect, useRef, useState } from 'react';

export const formatElapsed = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
};

// Cronómetro con marcas de tiempo (no sumando segundos), así sigue siendo
// exacto aunque el navegador pause los temporizadores en segundo plano.
// onTick(elapsedMs) se llama cada segundo mientras corre.
export function useStopwatch(onTick) {
  const [running, setRunning] = useState(false);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [, setTick] = useState(0);
  const startedAtRef = useRef(null);

  // En una ref para no reiniciar el intervalo cada vez que cambia el callback.
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const elapsedMs =
    accumulatedMs + (running ? Date.now() - startedAtRef.current : 0);

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    const interval = setInterval(() => {
      setTick((tick) => tick + 1);
      onTickRef.current?.(accumulatedMs + (Date.now() - startedAtRef.current));
    }, 1000);

    return () => clearInterval(interval);
  }, [running, accumulatedMs]);

  const toggle = () => {
    if (running) {
      setAccumulatedMs(elapsedMs);
      setRunning(false);
      return;
    }

    startedAtRef.current = Date.now();
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setAccumulatedMs(0);
  };

  return { elapsedMs, running, toggle, reset };
}
