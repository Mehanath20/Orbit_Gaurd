'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ProjectInfoModalProps {
  show: boolean;
  onClose: () => void;
}

export default function ProjectInfoModal({ show, onClose }: ProjectInfoModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(10,10,10,0.95)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: 20,
              padding: '32px 36px',
              maxWidth: 720,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 0 60px rgba(0, 212, 255, 0.1), 0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
                  ORBIT<span style={{ color: '#00d4ff' }}>GUARD</span>
                </h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  Space Debris Collision Risk Estimator · v1.0
                </p>
              </div>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18, padding: '4px 10px',
              }}>✕</button>
            </div>

            {/* About */}
            <Section title="ABOUT">
              <p>OrbitGuard is a real-time space debris collision risk analysis tool developed for ISRO&apos;s Department of Space. 
              It simulates orbital mechanics using Two-Line Element (TLE) data to calculate closest approach distances 
              between ISRO-SAT1 and catalogued debris objects in LEO.</p>
            </Section>

            {/* Features */}
            <Section title="KEY FEATURES">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: '🌍', label: 'Real-time 3D orbital visualization' },
                  { icon: '🛰', label: 'ISRO-SAT1 tracking (408 km LEO)' },
                  { icon: '⚠️', label: '4-tier risk classification system' },
                  { icon: '🎯', label: 'Debris intercept simulation' },
                  { icon: '💥', label: 'Impact scenario simulation' },
                  { icon: '📊', label: 'Approach distance graphing' },
                  { icon: '🪐', label: 'Full solar system orrery view' },
                  { icon: '➕', label: 'Custom object injection' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter, sans-serif' }}>
                    <span style={{ fontSize: 14 }}>{f.icon}</span> {f.label}
                  </div>
                ))}
              </div>
            </Section>

            {/* Sample Inputs */}
            <Section title="SAMPLE INPUTS — CUSTOM OBJECTS">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['OBJECT', 'ALT (km)', 'INCL (°)', 'RAAN (°)', 'ORBIT TYPE'].map(h => (
                      <th key={h} style={{ color: 'rgba(255,255,255,0.35)', padding: '6px 8px', textAlign: 'left', letterSpacing: '0.08em', fontSize: 8, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'ISS', alt: '408', incl: '51.6', raan: '0', type: 'LEO' },
                    { name: 'STARLINK', alt: '550', incl: '53.0', raan: '120', type: 'LEO' },
                    { name: 'HUBBLE', alt: '540', incl: '28.5', raan: '82', type: 'LEO' },
                    { name: 'TIANGONG', alt: '389', incl: '41.5', raan: '30', type: 'LEO' },
                    { name: 'COSMOS-DEB', alt: '780', incl: '74.0', raan: '200', type: 'LEO' },
                    { name: 'FENGYUN-1C', alt: '865', incl: '98.8', raan: '310', type: 'SSO' },
                    { name: 'ENVISAT', alt: '766', incl: '98.4', raan: '95', type: 'SSO' },
                    { name: 'GEO-SAT', alt: '35,786', incl: '0.0', raan: '45', type: 'GEO' },
                  ].map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '5px 8px', color: '#00d4ff', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.7)' }}>{r.alt}</td>
                      <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.7)' }}>{r.incl}</td>
                      <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.7)' }}>{r.raan}</td>
                      <td style={{ padding: '5px 8px' }}><span style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 4, padding: '1px 5px', fontSize: 8, color: '#00d4ff' }}>{r.type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {/* Risk Levels */}
            <Section title="RISK CLASSIFICATION">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { level: 'CRITICAL', range: '< 1 km', color: '#ff2d55', desc: 'Immediate avoidance maneuver required' },
                  { level: 'HIGH', range: '1 — 5 km', color: '#ff9500', desc: 'Close monitoring, prepare maneuver' },
                  { level: 'MODERATE', range: '5 — 25 km', color: '#ffd60a', desc: 'Tracking advisory, low concern' },
                  { level: 'LOW', range: '> 25 km', color: '#30d158', desc: 'Safe distance, routine monitoring' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ background: `${r.color}22`, border: `1px solid ${r.color}`, borderRadius: 6, padding: '3px 10px', fontSize: 9, color: r.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, minWidth: 80, textAlign: 'center' }}>{r.level}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)', minWidth: 70 }}>{r.range}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{r.desc}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* How To Use */}
            <Section title="HOW TO USE">
              <ol style={{ margin: 0, paddingLeft: 18, fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 2.0 }}>
                <li>The dashboard loads with pre-configured debris objects tracked against <strong style={{ color: '#00d4ff' }}>ISRO-SAT1</strong></li>
                <li>Use the <strong style={{ color: '#00d4ff' }}>Risk Filter</strong> (ALL / HIGH+ / CRITICAL) to narrow alerts</li>
                <li>Click any row in <strong style={{ color: '#00d4ff' }}>Proximity Alerts</strong> to view detailed analysis</li>
                <li>Click <strong style={{ color: '#00d4ff' }}>＋ ADD CUSTOM OBJECT</strong> to inject a new satellite/debris using presets or manual values</li>
                <li>Use <strong style={{ color: '#ff2d55' }}>⚠ INTERCEPT</strong> on critical objects to simulate debris neutralization</li>
                <li>Press <strong style={{ color: '#ff2d55' }}>SIMULATE IMPACT</strong> to visualize a catastrophic collision scenario</li>
                <li>Switch between <strong style={{ color: '#00d4ff' }}>Earth Focus</strong>, <strong style={{ color: '#00d4ff' }}>Solar System</strong>, and <strong style={{ color: '#00d4ff' }}>Satellite</strong> views using the top bar</li>
              </ol>
            </Section>

            {/* Tech Stack */}
            <Section title="TECHNOLOGY">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Next.js 14', 'React Three Fiber', 'Three.js', 'Recharts', 'Framer Motion', 'GLSL Shaders', 'TLE Parsing', 'TypeScript'].map(t => (
                  <span key={t} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{t}</span>
                ))}
              </div>
            </Section>

            {/* Footer */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.4)',
                  color: '#00d4ff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  padding: '12px 32px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(0, 212, 255, 0.15)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.15)';
                }}
              >
                PROCEED TO DASHBOARD →
              </button>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                Department of Space · ISRO · 2024
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {title}
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}
