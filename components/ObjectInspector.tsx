'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLiveGeodetic } from '../lib/orbitEngine';
import { PRIMARY_SATELLITE, DEBRIS_OBJECTS } from '../lib/dataset';
import type { ClosestApproachResult } from '../lib/types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedId: string | null;
  results: ClosestApproachResult[];
  onIntercept: (id: string) => void;
}

export default function ObjectInspector({ isOpen, onClose, selectedId, results, onIntercept }: Props) {
  const [liveGeo, setLiveGeo] = useState<{ lat: number; lon: number; alt: number; vel: number } | null>(null);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const updateTime = () => setTimeStr(new Date().toUTCString());
    updateTime();

    const interval = setInterval(() => {
      updateTime();
      if (selectedId === 'satellite') {
        const geo = getLiveGeodetic(PRIMARY_SATELLITE.tle1, PRIMARY_SATELLITE.tle2);
        if (geo) {
          setLiveGeo({ lat: geo.latitude, lon: geo.longitude, alt: geo.height, vel: geo.velocity });
        }
      } else if (selectedId) {
        const debrisDef = DEBRIS_OBJECTS.find(d => d.id === selectedId);
        if (debrisDef) {
          const geo = getLiveGeodetic(debrisDef.tle1, debrisDef.tle2);
          if (geo) {
            setLiveGeo({ lat: geo.latitude, lon: geo.longitude, alt: geo.height, vel: geo.velocity });
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, selectedId]);

  const renderContent = () => {
    if (!selectedId) return null;

    if (selectedId === 'satellite') {
      // Top 3 threats
      const threats = [...results].slice(0, 3);
      return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 700, color: '#00d4ff', display: 'flex', justifyContent: 'space-between' }}>
              <span>🛰 ISRO-SAT1</span>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Primary Tracked Satellite</div>
            <div style={{ color: '#30d158', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#30d158', display: 'inline-block', boxShadow: '0 0 8px #30d158' }} />
              OPERATIONAL
            </div>
          </div>

          <Section title="ORBITAL ELEMENTS">
            <GridRow label="Altitude" value="408 km" />
            <GridRow label="Inclination" value="51.6°" />
            <GridRow label="Period" value="92.68 min" />
            <GridRow label="RAAN" value="247.3°" />
            <GridRow label="Eccentricity" value="0.0006703" />
            <GridRow label="Mean Motion" value="15.49 rev/day" />
          </Section>

          <Section title="LIVE TELEMETRY">
            <GridRow label="Current Lat" value={liveGeo ? `${liveGeo.lat.toFixed(4)}°` : 'Computing...'} />
            <GridRow label="Current Lon" value={liveGeo ? `${liveGeo.lon.toFixed(4)}°` : 'Computing...'} />
            <GridRow label="Altitude AGL" value={liveGeo ? `${liveGeo.alt.toFixed(1)} km` : 'Computing...'} />
            <GridRow label="Velocity" value={liveGeo ? `${liveGeo.vel.toFixed(2)} km/s` : 'Computing...'} />
            <GridRow label="Local Time" value={timeStr || 'Loading...'} />
          </Section>

          <Section title="PHYSICAL SPECS">
            <GridRow label="Mass" value="1250 kg" />
            <GridRow label="Dimensions" value="2.4 × 1.8 × 1.6 m" />
            <GridRow label="Power" value="1.2 kW (solar)" />
            <GridRow label="Launch Date" value="2021-02-28" />
            <GridRow label="Operator" value="ISRO" />
          </Section>

          <Section title="PROXIMITY THREATS">
            {threats.map(t => (
              <div key={t.debrisId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '6px 0' }}>
                <span style={{ color: '#fff' }}>{t.debrisName}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t.minDistance_km} km</span>
                <span style={{ color: t.riskLevel === 'CRITICAL' ? '#ff2d55' : t.riskLevel === 'HIGH' ? '#ff6b00' : '#ffd60a' }}>{t.riskLevel}</span>
              </div>
            ))}
          </Section>

          <Section title="TLE DATA">
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 4, wordBreak: 'break-all' }}>
              <div>{PRIMARY_SATELLITE.tle1}</div>
              <div>{PRIMARY_SATELLITE.tle2}</div>
            </div>
          </Section>
        </div>
      );
    }

    const result = results.find(r => r.debrisId === selectedId);
    if (!result) return null;

    const def = DEBRIS_OBJECTS.find(d => d.id === selectedId);
    
    const riskColors: Record<string, string> = { CRITICAL: '#ff2d55', HIGH: '#ff6b00', MODERATE: '#ffd60a', LOW: '#30d158' };
    const color = riskColors[result.riskLevel] || '#ffffff';

    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 700, color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
            <span>☄ {result.debrisName}</span>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Type: {result.objectType}</div>
          <div style={{ color: color, fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 8px ${color}` }} />
            {result.riskLevel} RISK
          </div>
        </div>

        <Section title="ORBITAL ELEMENTS">
          <GridRow label="Altitude" value={`${result.altitude_km} km`} />
          <GridRow label="Inclination" value={`${result.inclination_deg}°`} />
          <GridRow label="Period" value={`${result.period_min} min`} />
        </Section>

        <Section title="COLLISION RISK DATA">
          <GridRow label="Min Distance" value={`${result.minDistance_km} km`} />
          <GridRow label="Time of CA" value={result.timeOfClosestApproach.toLocaleTimeString()} />
          <GridRow label="T-Minus" value={`${Math.floor(result.tMinusSeconds / 3600)}h ${Math.floor((result.tMinusSeconds % 3600) / 60)}m`} />
          <GridRow label="Closing Speed" value={`${result.relativeVelocity_kms} km/s`} />
        </Section>

        <Section title="PHYSICAL DATA (SYNTHETIC)">
          <GridRow label="Est. Mass" value={def ? `${def.mass_kg} kg` : 'Unknown'} />
          <GridRow label="Est. Size" value={def ? `${def.size_m} m` : 'Unknown'} />
          <GridRow label="Tumble Rate" value="2.3°/s" />
        </Section>

        <Section title="DISTANCE TREND">
          <div style={{ height: 60, width: '100%', marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.distanceOverTime}>
                <defs>
                  <linearGradient id="distGradientInsp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="distance" stroke={color} fill="url(#distGradientInsp)" dot={false} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {(result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH') && (
          <button
            style={{
              width: '100%',
              padding: '12px',
              marginTop: 10,
              background: 'rgba(255, 45, 85, 0.15)',
              border: '1px solid rgba(255, 45, 85, 0.5)',
              borderRadius: 8,
              color: '#ff2d55',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700,
              cursor: 'pointer',
              animation: 'pulse-glow-critical 2s infinite',
            }}
            onClick={() => onIntercept(result.debrisId)}
          >
            ⚠ LAUNCH INTERCEPTOR
          </button>
        )}
      </div>
    );
  };

  const renderContentWithPlanets = () => {
    const baseContent = renderContent();
    if (baseContent) return baseContent;

    if (!selectedId) return null;

    const PLANET_STATS: Record<string, { type: string; dist: string; period: string; mass: string; temp: string }> = {
      'Mercury': { type: 'Terrestrial Planet', dist: '57.9M km', period: '88 days', mass: '3.30 × 10^23 kg', temp: '167°C' },
      'Venus': { type: 'Terrestrial Planet', dist: '108.2M km', period: '225 days', mass: '4.87 × 10^24 kg', temp: '464°C' },
      'Earth': { type: 'Terrestrial Planet', dist: '149.6M km', period: '365.2 days', mass: '5.97 × 10^24 kg', temp: '15°C' },
      'Mars': { type: 'Terrestrial Planet', dist: '227.9M km', period: '687 days', mass: '6.42 × 10^23 kg', temp: '-65°C' },
      'Jupiter': { type: 'Gas Giant', dist: '778.5M km', period: '11.9 years', mass: '1.898 × 10^27 kg', temp: '-110°C' },
      'Saturn': { type: 'Gas Giant', dist: '1.43B km', period: '29.5 years', mass: '5.68 × 10^26 kg', temp: '-140°C' },
      'Uranus': { type: 'Ice Giant', dist: '2.87B km', period: '84.0 years', mass: '8.68 × 10^25 kg', temp: '-195°C' },
      'Neptune': { type: 'Ice Giant', dist: '4.50B km', period: '164.8 years', mass: '1.02 × 10^26 kg', temp: '-200°C' },
      'Pluto': { type: 'Dwarf Planet', dist: '5.91B km', period: '248 years', mass: '1.30 × 10^22 kg', temp: '-225°C' },
      'Sun': { type: 'G-Type Main-Sequence Star', dist: '0 km', period: '0 days', mass: '1.989 × 10^30 kg', temp: '5,500°C' },
      'Moon': { type: 'Natural Satellite', dist: '384,400 km', period: '27.3 days', mass: '7.34 × 10^22 kg', temp: '-53°C' },
    };

    if (PLANET_STATS[selectedId]) {
      const stats = PLANET_STATS[selectedId];
      return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 700, color: '#fbbf24', display: 'flex', justifyContent: 'space-between' }}>
              <span>{selectedId === 'Sun' ? '☀️' : selectedId === 'Moon' ? '🌑' : '🪐'} {selectedId.toUpperCase()}</span>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{stats.type}</div>
          </div>
          <Section title="ASTROMETRIC DATA">
            <GridRow label="Orbit Radius" value={stats.dist} />
            <GridRow label="Orbital Period" value={stats.period} />
          </Section>
          <Section title="PHYSICAL CHARACTERISTICS">
            <GridRow label="Mass" value={stats.mass} />
            <GridRow label="Mean Temp" value={stats.temp} />
          </Section>
        </div>
      );
    }

    return null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 'min(360px, 100vw)',
            height: '100%',
            background: 'rgba(8, 8, 8, 0.6)',
            backdropFilter: 'blur(24px) saturate(200%)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
            zIndex: 50,
            overflowY: 'auto',
            overflowX: 'hidden',
            color: '#fff',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {renderContentWithPlanets()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function GridRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#fff' }}>{value}</span>
    </div>
  );
}
