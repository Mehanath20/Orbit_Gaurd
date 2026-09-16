'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClosestApproachResult } from '../lib/types';
import { useEffect, useState } from 'react';

interface Props {
  result: ClosestApproachResult | null;
  impactCountdown?: number | null;
  onTrack: () => void;
  onIntercept: () => void;
  onDismiss: () => void;
}

export default function CollisionAlert({ result, impactCountdown, onTrack, onIntercept, onDismiss }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (result) setShow(true);
    else setShow(false);
  }, [result]);

  return (
    <AnimatePresence>
      {show && result && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
          style={{
            position: 'fixed',
            top: 40,
            left: '50%',
            zIndex: 1000,
            background: 'rgba(20, 0, 0, 0.95)',
            backdropFilter: 'blur(24px) saturate(200%)',
            border: '1px solid rgba(255, 45, 85, 0.5)',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(255, 45, 85, 0.3), 0 0 0 1px rgba(255, 45, 85, 0.2) inset',
            padding: '24px 32px',
            minWidth: 420,
            textAlign: 'center',
            animation: 'pulse-glow-critical 2s ease-in-out infinite',
          }}
        >
          <h2 style={{ color: '#ff2d55', fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>
            {result.debrisId === 'KILLER-DEBRIS' ? '⚠ NSG WARNING: EARTH IMPACT IMMINENT' : '⚠ CRITICAL PROXIMITY ALERT'}
          </h2>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#fff', marginBottom: 12 }}>
            <strong>{result.debrisName}</strong> is on collision course with {result.debrisId === 'KILLER-DEBRIS' ? 'EARTH' : 'ISRO-SAT1'}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 24, lineHeight: 1.6 }}>
            Estimated Impact: <span style={{ color: '#ff2d55' }}>
              {impactCountdown !== null && impactCountdown !== undefined ? `T-MINUS ${impactCountdown}s` : 'IMMINENT'}
            </span><br />
            Closing velocity: {result.debrisId === 'KILLER-DEBRIS' ? '~32.5 km/s' : '~7.8 km/s'}<br />
            Current distance: {result.minDistance_km.toFixed(2)} km and closing
          </div>
          
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <motion.button 
              onClick={onTrack}
              className="btn-ghost"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.05em'
              }}
              whileHover={{ background: 'rgba(255,255,255,0.15)', borderColor: '#fff' }}
            >
              TRACK DEBRIS
            </motion.button>
            <motion.button 
              onClick={onIntercept}
              style={{
                background: 'rgba(255, 45, 85, 0.15)',
                border: '1px solid rgba(255, 45, 85, 0.8)',
                color: '#ff2d55',
                padding: '10px 20px',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                boxShadow: '0 0 15px rgba(255, 45, 85, 0.5)',
              }}
              whileHover={{ background: 'rgba(255,45,85,0.3)', boxShadow: '0 0 25px rgba(255,45,85,0.8)' }}
            >
              LAUNCH INTERCEPTOR
            </motion.button>
          </div>
          <motion.button 
            onClick={onDismiss}
            style={{ position: 'absolute', top: 12, right: 16, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16 }}
            whileHover={{ color: '#fff', scale: 1.2 }}
          >
            ×
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
