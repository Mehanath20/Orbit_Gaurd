'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import SummaryCards from './SummaryCards';
import InputPanel from './InputPanel';
import RiskTable from './RiskTable';
import DebrisModal from './DebrisModal';
import type { ClosestApproachResult, UserAddedObject, DebrisObject } from '../lib/types';
import { runOrbitAnalysis } from '../lib/orbitEngine';

// Dynamic import to avoid SSR issues with Three.js
const OrbitalView = dynamic(() => import('./OrbitalView'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        INITIALIZING ORBITAL VIEW...
      </span>
    </div>
  ),
});

// Inline SVG orbit logo
function OrbitIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" fill="#00d4ff" />
      <ellipse cx="12" cy="12" rx="9" ry="4" stroke="#00d4ff" strokeOpacity="0.6" strokeWidth="1.2" fill="none" />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="4"
        stroke="#00d4ff"
        strokeOpacity="0.3"
        strokeWidth="1"
        fill="none"
        transform="rotate(60 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="4"
        stroke="#00d4ff"
        strokeOpacity="0.3"
        strokeWidth="1"
        fill="none"
        transform="rotate(-60 12 12)"
      />
    </svg>
  );
}

export default function Dashboard() {
  const [results, setResults] = useState<ClosestApproachResult[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [timeWindow, setTimeWindow] = useState(24);
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH+' | 'CRITICAL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalResult, setModalResult] = useState<ClosestApproachResult | null>(null);
  const [extraDebris, setExtraDebris] = useState<DebrisObject[]>([]);

  // Initial compute
  useEffect(() => {
    const computed = runOrbitAnalysis(24, []);
    setResults(computed);
  }, []);

  const runAnalysis = useCallback(
    async (tw: number, extra: DebrisObject[]) => {
      setIsComputing(true);
      // UX drama: 1.2s fake delay
      await new Promise((res) => setTimeout(res, 1200));
      const computed = runOrbitAnalysis(tw, extra);
      setResults(computed);
      setIsComputing(false);
    },
    []
  );

  const handleRerun = () => {
    runAnalysis(timeWindow, extraDebris);
  };

  const handleTimeWindowChange = (h: number) => {
    setTimeWindow(h);
  };

  const handleAddObject = (obj: UserAddedObject) => {
    // Convert UserAddedObject to a synthetic DebrisObject with TLE
    const id = `USER-${Date.now()}`;
    // Mean motion for given altitude: n = sqrt(GM/a^3)
    // Approximate: ~15.5 - (alt - 400) * 0.0027 rev/day
    const n = Math.max(14.5, 15.77 - (obj.altitude_km - 300) * 0.003);
    const eccStr = '0001000';
    const incl = obj.inclination_deg.toFixed(4).padStart(8, ' ');
    const raan = obj.raan_deg.toFixed(4).padStart(8, ' ');
    const ma = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    const nm = n.toFixed(8).padStart(11, ' ');

    const newDebris: DebrisObject = {
      id,
      name: obj.name.toUpperCase(),
      tle1: `1 99001U 24099A   24001.50000000  .00001500  00000-0  10000-3 0  9991`,
      tle2: `2 99001 ${incl} ${raan} ${eccStr} 100.0000 ${ma}${nm}433600`,
      type: 'Fragment',
    };

    const updated = [...extraDebris, newDebris];
    setExtraDebris(updated);
    runAnalysis(timeWindow, updated);
  };

  const criticalCount = results.filter((r) => r.riskLevel === 'CRITICAL').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="dashboard-root"
      style={{
        background: `radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.03) 0%, transparent 50%), #000000`,
      }}
    >
      {/* ── LEFT PANEL ────────────────────────────────────────────── */}
      <div className="left-panel">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <OrbitIcon />
            <div>
              <div
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  lineHeight: 1,
                }}
              >
                ORBIT<span style={{ color: '#00d4ff' }}>GUARD</span>
              </div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.1em',
                  marginTop: 2,
                }}
              >
                Threat Assessment Dashboard
              </div>
            </div>
          </div>

          {/* Status indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'rgba(48,209,88,0.08)',
              border: '1px solid rgba(48,209,88,0.2)',
              borderRadius: 9999,
            }}
          >
            <div className="tracking-dot" />
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 8,
                color: '#30d158',
                letterSpacing: '0.1em',
              }}
            >
              TRACKING ACTIVE
            </span>
          </div>
        </motion.div>

        {/* Alert banner if critical */}
        {criticalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              background: 'rgba(255,45,85,0.08)',
              border: '1px solid rgba(255,45,85,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠</span>
            <div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  color: '#ff2d55',
                  fontWeight: 600,
                  animation: 'pulse-glow-critical 2s ease-in-out infinite',
                }}
              >
                {criticalCount} CRITICAL THREAT{criticalCount > 1 ? 'S' : ''} DETECTED
              </div>
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: 2,
                }}
              >
                Immediate collision risk assessment required
              </div>
            </div>
          </motion.div>
        )}

        {/* Summary Cards */}
        <SummaryCards results={results} timeWindow={timeWindow} />

        {/* Input Controls */}
        <InputPanel
          timeWindow={timeWindow}
          onTimeWindowChange={handleTimeWindowChange}
          riskFilter={riskFilter}
          onRiskFilterChange={setRiskFilter}
          isComputing={isComputing}
          onRerun={handleRerun}
          onAddObject={handleAddObject}
        />

        {/* Risk Table */}
        <RiskTable
          results={results}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onOpenModal={setModalResult}
          riskFilter={riskFilter}
        />

        {/* Footer */}
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'center',
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.04)',
            lineHeight: 1.6,
          }}
        >
          SprintStack Hackathon · PS09
          <br />
          SGP4 Propagation · satellite.js · Three.js
          <br />
          ⚠ Not for operational use
        </div>
      </div>

      {/* ── RIGHT PANEL — 3D Orbital View ────────────────────────── */}
      <div className="right-panel">
        {results.length > 0 ? (
          <OrbitalView
            results={results}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              const r = results.find((x) => x.debrisId === id);
              if (r) setModalResult(r);
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              COMPUTING ORBITAL ANALYSIS...
            </span>
          </div>
        )}
      </div>

      {/* Modal */}
      <DebrisModal result={modalResult} onClose={() => setModalResult(null)} />
    </motion.div>
  );
}
