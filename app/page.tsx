'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports to prevent SSR issues with Three.js
const IntroScene = dynamic(() => import('../components/IntroScene'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '2px solid rgba(0,212,255,0.2)',
          borderTopColor: '#00d4ff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  ),
});

const Dashboard = dynamic(() => import('../components/Dashboard'), {
  ssr: false,
});

export default function HomePage() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <main style={{ height: '100vh', overflow: 'hidden', background: '#000' }}>
      {!introDone && <IntroScene onEnter={() => setIntroDone(true)} />}
      {introDone && <Dashboard />}
    </main>
  );
}
