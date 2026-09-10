import { useEffect, useRef, useState } from 'react';

/** Batch rapid CPU updates into a single, brief visual highlight. */
export function useChangedValues(values: Record<string, number>) {
  const previous = useRef({ ...values });
  const pending = useRef(new Set<string>());
  const batch = useRef<ReturnType<typeof setTimeout>>();
  const clear = useRef<ReturnType<typeof setTimeout>>();
  const [changed, setChanged] = useState(new Set<string>());
  useEffect(() => {
    for (const key of Object.keys(values)) {
      if (key in previous.current && previous.current[key] !== values[key])
        pending.current.add(key);
    }
    previous.current = { ...values };
    if (pending.current.size && !batch.current) {
      batch.current = setTimeout(() => {
        setChanged(new Set(pending.current));
        pending.current.clear();
        batch.current = undefined;
        clearTimeout(clear.current);
        clear.current = setTimeout(() => setChanged(new Set()), 650);
      }, 180);
    }
  }, [values]);
  useEffect(
    () => () => {
      clearTimeout(batch.current);
      clearTimeout(clear.current);
    },
    []
  );
  return changed;
}
