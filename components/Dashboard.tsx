'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import SummaryCards from './SummaryCards';
import InputPanel from './InputPanel';
import RiskTable from './RiskTable';
import DebrisModal from './DebrisModal';
import CollisionAlert from './CollisionAlert';
import SuccessBanner from './SuccessBanner';
import ObjectInspector from './ObjectInspector';
import ProjectInfoModal from './ProjectInfoModal';
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
  const [criticalAlertResult, setCriticalAlertResult] = useState<ClosestApproachResult | null>(null);
  const [isIntercepting, setIsIntercepting] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    // Show tip after 3 seconds, hide after 12 seconds
    const t1 = setTimeout(() => setShowTip(true), 3000);
    const t2 = setTimeout(() => setShowTip(false), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const [isImpacted, setIsImpacted] = useState(false);
  const [impactCountdown, setImpactCountdown] = useState<number | null>(null);

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
      
      const firstCritical = computed.find(r => r.riskLevel === 'CRITICAL');
      if (firstCritical) {
        setCriticalAlertResult(firstCritical);
      }
    },
    []
  );

  const handleIntercept = (id: string) => {
    setCriticalAlertResult(null);
    setModalResult(null);
    setInspectorOpen(false);
    setSelectedId(id);
    setIsIntercepting(id);
    setImpactCountdown(null); // Clear countdown if intercepting!
  };

  const handleInterceptComplete = () => {
    const interceptedId = isIntercepting;
    setIsIntercepting(null);
    setShowSuccessBanner(true);
    setResults(prev => prev.filter(r => r.debrisId !== interceptedId));
    setTimeout(() => {
        setShowSuccessBanner(false);
        setSelectedId(null);
    }, 4000);
  };

  const handleRerun = () => {
    runAnalysis(timeWindow, extraDebris);
  };

  const handleTimeWindowChange = (h: number) => {
    setTimeWindow(h);
  };

  const handleSimulateImpact = () => {
    const killerDebris: DebrisObject = {
      id: 'KILLER-DEBRIS',
      name: 'APOPHIS-99',
      // We will override its orbit points in OrbitalView.tsx to make it head straight for Earth
      tle1: '1 99999U 25001A   25001.00000000  .00000000  00000-0  00000-0 0  9999',
      tle2: '2 99999   0.0000   0.0000 0000000   0.0000   0.0000  0.00000000    09',
      type: 'Fragment', // Or ASTEROID
    };

    const updated = [...extraDebris, killerDebris];
    setExtraDebris(updated);
    
    // We instantly add it to results so we don't wait 1.2s for the "drama" loading screen
    const killerResult: ClosestApproachResult = {
      debrisId: killerDebris.id,
      debrisName: killerDebris.name,
      objectType: killerDebris.type,
      minDistance_km: 1540.2, // very close
      timeOfClosestApproach: new Date(),
      tMinusSeconds: 15,
      altitude_km: 0,
      inclination_deg: 0,
      raan_deg: 0,
      period_min: 0,
      eccentricity: 0,
      distanceOverTime: [],
      relativeVelocity_kms: 32.5,
      riskLevel: 'CRITICAL',
    };

    setResults(prev => [...prev, killerResult]);
    setCriticalAlertResult(killerResult);
    
    // Start 15-second countdown to impact
    setImpactCountdown(15);
  };

  useEffect(() => {
    if (impactCountdown !== null && impactCountdown > 0) {
      const timer = setTimeout(() => {
        setImpactCountdown(prev => (prev ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (impactCountdown === 0) {
      // IMPACT!
      setIsImpacted(true);
      setCriticalAlertResult(null);
    }
  }, [impactCountdown]);

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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div>ORBIT<span style={{ color: '#00d4ff' }}>GUARD</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <button
                    onClick={() => setShowInfo(true)}
                    className="btn-pill-blink"
                    style={{
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid rgba(0, 212, 255, 0.6)',
                      color: '#00d4ff',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Project Info & Details"
                  >
                    i
                  </button>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      color: '#00d4ff',
                      letterSpacing: '0.1em',
                      animation: 'blink-pulse 2s ease-in-out infinite',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowInfo(true)}
                  >
                    ← DETAILS
                  </span>
                </div>
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

          <button
            onClick={handleSimulateImpact}
            style={{
              marginLeft: 16,
              background: 'rgba(255, 45, 85, 0.2)',
              border: '1px solid rgba(255, 45, 85, 0.5)',
              color: '#ff2d55',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              fontWeight: 'bold',
              letterSpacing: '0.05em',
            }}
          >
            🚨 SIMULATE IMPACT
          </button>
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
          onIntercept={handleIntercept}
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
          SprintStack Hackathon
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
            extraDebris={extraDebris}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setInspectorOpen(true);
            }}
            interceptTargetId={isIntercepting}
            onInterceptComplete={handleInterceptComplete}
            isImpacted={isImpacted}
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

      {/* Modals & Overlays */}
      <ObjectInspector
        isOpen={inspectorOpen}
        onClose={() => {
          setInspectorOpen(false);
          setSelectedId(null);
        }}
        selectedId={selectedId}
        results={results}
        onIntercept={handleIntercept}
      />

      <DebrisModal 
        result={modalResult} 
        onClose={() => setModalResult(null)} 
        onIntercept={handleIntercept} 
      />
      
      <CollisionAlert
        result={criticalAlertResult}
        impactCountdown={impactCountdown}
        onTrack={() => {
          if (criticalAlertResult) setSelectedId(criticalAlertResult.debrisId);
          setCriticalAlertResult(null);
        }}
        onIntercept={() => {
          if (criticalAlertResult) handleIntercept(criticalAlertResult.debrisId);
        }}
        onDismiss={() => setCriticalAlertResult(null)}
      />

      <SuccessBanner
        show={showSuccessBanner}
        onDismiss={() => setShowSuccessBanner(false)}
      />

      {/* Tip Toast */}
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            style={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 212, 255, 0.4)',
              borderRadius: 30,
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 25px rgba(0,212,255,0.2)',
            }}
          >
            <span style={{ fontSize: 18 }}>💡</span>
            <span style={{ 
              fontFamily: 'Inter, sans-serif', 
              fontSize: 13, 
              color: '#fff',
              fontWeight: 500 
            }}>
              Tip: Click the pulsing <strong style={{ color: '#00d4ff' }}>ⓘ DETAILS</strong> button in the top left to view project features and sample inputs.
            </span>
            <button 
              onClick={() => setShowTip(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: 20,
                marginLeft: 12,
                padding: 0
              }}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ProjectInfoModal show={showInfo} onClose={() => setShowInfo(false)} />
    </motion.div>
  );
}
