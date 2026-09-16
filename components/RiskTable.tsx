'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClosestApproachResult, RiskLevel } from '../lib/types';

const RISK_COLORS: Record<RiskLevel, string> = {
  CRITICAL: '#ff2d55',
  HIGH: '#ff9500',
  MODERATE: '#ffd60a',
  LOW: '#30d158',
};

interface RiskTableProps {
  results: ClosestApproachResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenModal: (result: ClosestApproachResult) => void;
  riskFilter: 'ALL' | 'HIGH+' | 'CRITICAL';
}

function TMinusTimer({ targetDate }: { targetDate: Date }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setDisplay('T+00:00');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) {
        setDisplay(`T-${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      } else {
        setDisplay(`T-${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return <span>{display}</span>;
}

export default function RiskTable({
  results,
  selectedId,
  onSelect,
  onOpenModal,
  riskFilter,
}: RiskTableProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = results.filter((r) => {
    if (riskFilter === 'CRITICAL') return r.riskLevel === 'CRITICAL';
    if (riskFilter === 'HIGH+')
      return r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH';
    return true;
  });

  return (
    <div className="glass-card" style={{ padding: '16px', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 12,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.1em',
          }}
        >
          PROXIMITY ALERTS
        </span>
        <span
          style={{
            background: 'rgba(0,212,255,0.15)',
            border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: 9999,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: '#00d4ff',
            padding: '2px 8px',
          }}
        >
          {filtered.length}
        </span>
      </div>

      {/* Column Headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 72px 80px 60px',
          gap: 4,
          padding: '0 8px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          marginBottom: 4,
        }}
      >
        {['OBJECT', 'DIST (km)', 'T-MINUS', 'RISK', ''].map((h) => (
          <span
            key={h}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.1em',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 2 }}>
        <AnimatePresence>
          {filtered.map((result, i) => {
            const color = RISK_COLORS[result.riskLevel];
            const isSelected = selectedId === result.debrisId;
            const isHovered = hoveredId === result.debrisId;

            return (
              <motion.div
                key={result.debrisId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 72px 80px 60px',
                  gap: 4,
                  padding: '8px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  borderLeft: isSelected || isHovered ? `2px solid ${color}` : '2px solid transparent',
                  background:
                    isSelected
                      ? `rgba(${color === '#ff2d55' ? '255,45,85' : color === '#ff9500' ? '255,149,0' : '0,212,255'},0.08)`
                      : isHovered
                      ? 'rgba(255,255,255,0.04)'
                      : 'transparent',
                  transition: 'all 0.15s ease',
                  alignItems: 'center',
                  marginBottom: 2,
                }}
                onMouseEnter={() => setHoveredId(result.debrisId)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  onSelect(result.debrisId);
                  onOpenModal(result);
                }}
              >
                {/* Name */}
                <div>
                  <div
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      color: '#ffffff',
                      fontWeight: 600,
                    }}
                  >
                    {result.debrisName}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {result.objectType}
                  </div>
                </div>

                {/* Distance */}
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    color: '#ffffff',
                    fontWeight: 600,
                  }}
                >
                  {result.minDistance_km.toFixed(2)}
                </div>

                {/* T-Minus */}
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  <TMinusTimer targetDate={result.timeOfClosestApproach} />
                </div>

                {/* Risk badge */}
                <div>
                  <span
                    className={`risk-badge ${result.riskLevel}`}
                    style={
                      result.riskLevel === 'CRITICAL'
                        ? { animation: 'pulse-glow-critical 2s ease-in-out infinite' }
                        : {}
                    }
                  >
                    {result.riskLevel === 'CRITICAL' && '⬤ '}
                    {result.riskLevel}
                  </span>
                </div>

                {/* Track button */}
                <div>
                  {(isHovered || isSelected) && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="btn-cyan"
                      style={{
                        padding: '3px 8px',
                        fontSize: 9,
                        borderRadius: 4,
                        letterSpacing: '0.05em',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(result.debrisId);
                      }}
                    >
                      TRACK
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            No objects match current filter
          </div>
        )}
      </div>
    </div>
  );
}
