'use client';
import { useEffect } from 'react';
export default function ErrorLogger() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      fetch('/api/log', {
        method: 'POST',
        body: JSON.stringify({ message: event.message, stack: event.error?.stack })
      });
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);
  return null;
}
