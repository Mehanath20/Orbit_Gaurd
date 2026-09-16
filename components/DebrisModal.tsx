'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { ClosestApproachResult, RiskLevel } from '../lib/types';

const RISK_COLORS: Record<RiskLevel, string> = {
  CRITICAL: '#ff2d55',
  HIGH: '#ff9500',
  MODERATE: '#ffd60a',
  LOW: '#30d158',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  CRITICAL: '⬤ CRITICAL',
  HIGH: '▲ HIGH',
  MODERATE: '◆ MODERATE',
  LOW: '● LOW',
};

interface DebrisModalProps {
  result: ClosestApproachResult | null;
  onClose: () => void;
  onIntercept: (id: string) => void;
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.12em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          color: '#ffffff',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MetricBox({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: '14px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 10,
        border: `1px solid ${color ? color + '30' : 'rgba(255,255,255,0.05)'}`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 20,
          fontWeight: 700,
          color: color || '#fff',
          marginBottom: 4,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              marginLeft: 4,
            }}
          >
            {unit}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// Custom tooltip for chart
function CustomTooltip({
  active,
  payload,
  label,
  riskColor,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
  riskColor: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.9)',
        border: `1px solid ${riskColor}40`,
        borderRadius: 8,
        padding: '8px 12px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
        T+{(label as number).toFixed(1)}h
      </div>
      <div style={{ color: riskColor, fontWeight: 600 }}>
        {payload[0].value.toFixed(2)} km
      </div>
    </div>
  );
}

export default function DebrisModal({ result, onClose, onIntercept }: DebrisModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!result) return null;

  const riskColor = RISK_COLORS[result.riskLevel];

  const tcaStr = result.timeOfClosestApproach.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <AnimatePresence>
      {result && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              zIndex: 201,
              width: '100%',
              maxWidth: 640,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'rgba(10,10,10,0.98)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: `1px solid ${riskColor}30`,
              borderRadius: 20,
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.04) inset,
                0 24px 80px rgba(0,0,0,0.9),
                0 0 60px ${riskColor}15
              `,
              padding: '24px',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#fff',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {result.debrisName}
                  </h2>
                  <span
                    className={`risk-badge ${result.riskLevel}`}
                    style={{
                      fontSize: 11,
                      padding: '4px 12px',
                      ...(result.riskLevel === 'CRITICAL'
                        ? { animation: 'pulse-glow-critical 2s ease-in-out infinite' }
                        : {}),
                    }}
                  >
                    {RISK_LABELS[result.riskLevel]}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {result.objectType} · vs ISRO-SAT1
                </div>
              </div>
              {/* Close button */}
              <motion.button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 18,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                whileHover={{ background: 'rgba(255,255,255,0.1)', color: '#fff', scale: 1.1 }}
              >
                ×
              </motion.button>
            </div>

            {/* Orbital Elements Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <InfoRow label="ALTITUDE" value={`${result.altitude_km} km`} />
              <InfoRow label="INCLINATION" value={`${result.inclination_deg}°`} />
              <InfoRow label="RAAN" value={`${result.raan_deg}°`} />
              <InfoRow label="ORBITAL PERIOD" value={`${result.period_min} min`} />
              <InfoRow label="ECCENTRICITY" value={result.eccentricity.toFixed(4)} />
              <InfoRow label="OBJECT TYPE" value={result.objectType} />
            </div>

            {/* Key Metrics */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <MetricBox
                label="MIN DISTANCE"
                value={result.minDistance_km.toFixed(2)}
                unit="km"
                color={riskColor}
              />
              <MetricBox label="TIME OF CA" value={tcaStr} color="#00d4ff" />
              <MetricBox
                label="REL. VELOCITY"
                value={result.relativeVelocity_kms.toFixed(2)}
                unit="km/s"
                color="#ffd60a"
              />
            </div>

            {/* Distance Over Time Chart */}
            <div
              style={{
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '16px',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.12em',
                  marginBottom: 12,
                }}
              >
                DISTANCE FROM ISRO-SAT1 (24H WINDOW)
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart
                  data={result.distanceOverTime}
                  margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                >
                  <defs>
                    <linearGradient id="distGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={riskColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tick={{
                      fill: 'rgba(255,255,255,0.3)',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                    }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}h`}
                  />
                  <YAxis
                    tick={{
                      fill: 'rgba(255,255,255,0.3)',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                    }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}`}
                    width={35}
                  />
                  <Tooltip
                    content={<CustomTooltip riskColor={riskColor} />}
                  />
                  {/* CRITICAL threshold: 1km */}
                  <ReferenceLine
                    y={1}
                    stroke="#ff2d55"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{
                      value: '1km (CRITICAL)',
                      fill: '#ff2d55',
                      fontSize: 8,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  {/* HIGH threshold: 5km */}
                  <ReferenceLine
                    y={5}
                    stroke="#ff9500"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{
                      value: '5km (HIGH)',
                      fill: '#ff9500',
                      fontSize: 8,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="distance"
                    stroke={riskColor}
                    strokeWidth={2}
                    fill="url(#distGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: riskColor, stroke: '#000', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Action Button */}
            {(result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH') && (
              <motion.button
                style={{
                  width: '100%',
                  padding: '16px',
                  marginTop: 20,
                  marginBottom: 16,
                  background: 'rgba(255, 45, 85, 0.15)',
                  border: '1px solid rgba(255, 45, 85, 0.5)',
                  borderRadius: 8,
                  color: '#ff2d55',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(255, 45, 85, 0.2)',
                  animation: 'pulse-glow-critical 2s infinite',
                }}
                whileHover={{ background: 'rgba(255, 45, 85, 0.3)', boxShadow: '0 0 30px rgba(255,45,85,0.8)' }}
                onClick={() => {
                  onIntercept(result.debrisId);
                  onClose();
                }}
              >
                ⚠ LAUNCH INTERCEPTOR
              </motion.button>
            )}

            {/* Disclaimer */}
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                color: 'rgba(255,149,0,0.5)',
                textAlign: 'center',
                padding: '8px 0 0',
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              ⚠ Approximate values. Not for operational use.
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
