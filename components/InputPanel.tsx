'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserAddedObject } from '../lib/types';

interface InputPanelProps {
  timeWindow: number;
  onTimeWindowChange: (hours: number) => void;
  riskFilter: 'ALL' | 'HIGH+' | 'CRITICAL';
  onRiskFilterChange: (f: 'ALL' | 'HIGH+' | 'CRITICAL') => void;
  isComputing: boolean;
  onRerun: () => void;
  onAddObject: (obj: UserAddedObject) => void;
}

const TIME_OPTIONS = [6, 12, 24, 48] as const;
const RISK_FILTERS = ['ALL', 'HIGH+', 'CRITICAL'] as const;

export default function InputPanel({
  timeWindow,
  onTimeWindowChange,
  riskFilter,
  onRiskFilterChange,
  isComputing,
  onRerun,
  onAddObject,
}: InputPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [addExpanded, setAddExpanded] = useState(false);
  const [newObj, setNewObj] = useState<UserAddedObject>({
    name: '',
    altitude_km: 408,
    inclination_deg: 51.6,
    raan_deg: 0,
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObj.name.trim()) return;
    onAddObject({ ...newObj });
    setNewObj({ name: '', altitude_km: 408, inclination_deg: 51.6, raan_deg: 0 });
    setAddExpanded(false);
  };

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <button
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          color: '#fff',
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#ffffff',
          }}
        >
          SIMULATION CONTROLS
        </span>
        <motion.span
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}
        >
          ⌃
        </motion.span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Time Window */}
              <div>
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.15em',
                    marginBottom: 8,
                  }}
                >
                  TIME WINDOW
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {TIME_OPTIONS.map((h) => (
                    <button
                      key={h}
                      className={`btn-pill ${timeWindow === h ? 'active' : ''}`}
                      onClick={() => onTimeWindowChange(h)}
                      style={{ textAlign: 'center', padding: '6px 0', width: '100%' }}
                    >
                      {h}H
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Filter */}
              <div>
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.15em',
                    marginBottom: 8,
                  }}
                >
                  RISK FILTER
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {RISK_FILTERS.map((f) => (
                    <button
                      key={f}
                      className={`btn-pill ${riskFilter === f ? 'active' : ''}`}
                      onClick={() => onRiskFilterChange(f)}
                      style={{ textAlign: 'center', padding: '6px 0', width: '100%' }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Object */}
              <div>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 0,
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => setAddExpanded((e) => !e)}
                >
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.15em',
                    }}
                  >
                    ADD CUSTOM OBJECT
                  </span>
                  <motion.span
                    animate={{ rotate: addExpanded ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ color: '#00d4ff', fontSize: 16, lineHeight: 1 }}
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence>
                  {addExpanded && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleAddSubmit}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginTop: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <input
                        className="glass-input"
                        placeholder="Object name (e.g. STARLINK-TEST)"
                        value={newObj.name}
                        onChange={(e) => setNewObj((o) => ({ ...o, name: e.target.value }))}
                        required
                        style={{ fontSize: 11 }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        <div>
                          <div
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 8,
                              color: 'rgba(255,255,255,0.35)',
                              marginBottom: 4,
                              letterSpacing: '0.08em',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            ALT (km)
                          </div>
                          <input
                            className="glass-input"
                            type="number"
                            placeholder="408"
                            value={newObj.altitude_km}
                            onChange={(e) =>
                              setNewObj((o) => ({
                                ...o,
                                altitude_km: parseFloat(e.target.value) || 408,
                              }))
                            }
                            style={{ fontSize: 11, padding: '6px 8px' }}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 8,
                              color: 'rgba(255,255,255,0.35)',
                              marginBottom: 4,
                              letterSpacing: '0.08em',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            INCL (°)
                          </div>
                          <input
                            className="glass-input"
                            type="number"
                            placeholder="51.6"
                            value={newObj.inclination_deg}
                            onChange={(e) =>
                              setNewObj((o) => ({
                                ...o,
                                inclination_deg: parseFloat(e.target.value) || 51.6,
                              }))
                            }
                            style={{ fontSize: 11, padding: '6px 8px' }}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 8,
                              color: 'rgba(255,255,255,0.35)',
                              marginBottom: 4,
                              letterSpacing: '0.08em',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            RAAN (°)
                          </div>
                          <input
                            className="glass-input"
                            type="number"
                            placeholder="0"
                            value={newObj.raan_deg}
                            onChange={(e) =>
                              setNewObj((o) => ({
                                ...o,
                                raan_deg: parseFloat(e.target.value) || 0,
                              }))
                            }
                            style={{ fontSize: 11, padding: '6px 8px' }}
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn-cyan" style={{ width: '100%', marginTop: 4, padding: '8px' }}>
                        ADD TO SIMULATION
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* Re-run button */}
              <button
                className="btn-cyan"
                onClick={onRerun}
                disabled={isComputing}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: isComputing ? 0.7 : 1,
                }}
              >
                {isComputing ? (
                  <>
                    <div className="spinner" />
                    COMPUTING...
                  </>
                ) : (
                  'RE-RUN ANALYSIS'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
