import React, { useState, useEffect } from 'react';

export const safeNum = (val: number | string): number => {
  if (typeof val === 'number') return val;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatScientific = (num: number, decimals = 2): string => {
  if (num === 0) return '0';
  if (Math.abs(num) < 0.0001 || Math.abs(num) > 10000) {
    return num.toExponential(decimals);
  }
  return num.toFixed(decimals);
};

// Simple Hook for local storage persistence
export function usePersistedState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}

export const UNITS = {
  mass: {
    g: 1,
    mg: 1e-3,
    µg: 1e-6,
    kg: 1e3
  },
  volume: {
    L: 1,
    mL: 1e-3,
    µL: 1e-6
  },
  concentration: {
    M: 1,
    mM: 1e-3,
    µM: 1e-6,
    nM: 1e-9
  }
};