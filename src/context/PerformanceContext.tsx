import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type PerformancePreference = 'auto' | 'full' | 'balanced' | 'lite';
export type PerformanceTier = 'full' | 'balanced' | 'lite';

interface PerformanceContextValue {
  preference: PerformancePreference;
  setPreference: (pref: PerformancePreference) => void;
  autoTier: PerformanceTier;
  tier: PerformanceTier;
  isSimplified: boolean;
  isLite: boolean;
  lockBoardPan: boolean;
  setLockBoardPan: (locked: boolean) => void;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

const PREF_KEY = 'catan_perf_preference';
const LOCK_PAN_KEY = 'catan_lock_board_pan';
const LEGACY_LOW_END_KEY = 'catan_low_end_pc_mode';

export function detectDevicePerformanceTier(): PerformanceTier {
  if (typeof window === 'undefined') return 'full';

  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'lite';
    }
  } catch {
    // Ignore matchMedia issues in older webviews
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  if (nav.connection?.saveData) {
    return 'lite';
  }

  const isCoarsePointer = (() => {
    try {
      return window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  })();

  const minSide = Math.min(window.innerWidth, window.innerHeight);
  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 8;
  const memGb = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8;

  if (isCoarsePointer) {
    // Phones with modest specs or slow network get lite tier; modern phones/tablets get balanced
    if (minSide < 600 && (cores <= 4 || memGb <= 4 || nav.connection?.effectiveType === '2g' || nav.connection?.effectiveType === '3g')) {
      return 'lite';
    }
    return 'balanced';
  }

  // Desktop: keep full fidelity unless explicitly low-spec hardware
  if (cores <= 2 || memGb <= 2) {
    return 'balanced';
  }

  return 'full';
}

function readInitialPreference(): PerformancePreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved === 'auto' || saved === 'full' || saved === 'balanced' || saved === 'lite') {
      return saved;
    }
    if (localStorage.getItem(LEGACY_LOW_END_KEY) === 'true') {
      return 'lite';
    }
  } catch {
    // Ignore storage restriction
  }
  return 'auto';
}

function readInitialLockPan(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LOCK_PAN_KEY) === 'true';
  } catch {
    return false;
  }
}

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<PerformancePreference>(readInitialPreference);
  const [autoTier, setAutoTier] = useState<PerformanceTier>(detectDevicePerformanceTier);
  const [lockBoardPan, setLockBoardPanState] = useState<boolean>(readInitialLockPan);

  useEffect(() => {
    const refresh = () => setAutoTier(detectDevicePerformanceTier());
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarseMq = window.matchMedia('(pointer: coarse)');
    const addListener = (mq: MediaQueryList, fn: () => void) => {
      if (mq.addEventListener) mq.addEventListener('change', fn);
      else mq.addListener(fn);
    };
    const removeListener = (mq: MediaQueryList, fn: () => void) => {
      if (mq.removeEventListener) mq.removeEventListener('change', fn);
      else mq.removeListener(fn);
    };
    addListener(reducedMq, refresh);
    addListener(coarseMq, refresh);
    window.addEventListener('resize', refresh, { passive: true });
    return () => {
      removeListener(reducedMq, refresh);
      removeListener(coarseMq, refresh);
      window.removeEventListener('resize', refresh);
    };
  }, []);

  const tier: PerformanceTier = preference === 'auto' ? autoTier : preference;

  useEffect(() => {
    document.documentElement.dataset.perfTier = tier;
  }, [tier]);

  const setPreference = useCallback((pref: PerformancePreference) => {
    setPreferenceState(pref);
    try {
      localStorage.setItem(PREF_KEY, pref);
      localStorage.setItem(LEGACY_LOW_END_KEY, String(pref === 'lite'));
    } catch {
      // Ignore storage restriction
    }
  }, []);

  const setLockBoardPan = useCallback((locked: boolean) => {
    setLockBoardPanState(locked);
    try {
      localStorage.setItem(LOCK_PAN_KEY, String(locked));
    } catch {
      // Ignore storage restriction
    }
  }, []);

  const value = useMemo<PerformanceContextValue>(
    () => ({
      preference,
      setPreference,
      autoTier,
      tier,
      isSimplified: tier !== 'full',
      isLite: tier === 'lite',
      lockBoardPan,
      setLockBoardPan,
    }),
    [preference, setPreference, autoTier, tier, lockBoardPan, setLockBoardPan]
  );

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
};

export function usePerformance(): PerformanceContextValue {
  const ctx = useContext(PerformanceContext);
  if (!ctx) {
    return {
      preference: 'auto',
      setPreference: () => {},
      autoTier: 'full',
      tier: 'full',
      isSimplified: false,
      isLite: false,
      lockBoardPan: false,
      setLockBoardPan: () => {},
    };
  }
  return ctx;
}
