'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  show: boolean;
  onDismiss: () => void;
}

export default function SuccessBanner({ show, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            zIndex: 1000,
            background: 'rgba(10, 40, 20, 0.95)',
            backdropFilter: 'blur(24px) saturate(200%)',
            border: '1px solid rgba(48, 209, 88, 0.5)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(48, 209, 88, 0.2), 0 0 0 1px rgba(48, 209, 88, 0.2) inset',
            padding: '16px 24px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 24, color: '#30d158' }}>✓</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, color: '#30d158', fontWeight: 600 }}>
              INTERCEPTOR SUCCESSFUL — DEBRIS NEUTRALIZED
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              ISRO-SAT1 is SAFE · Threat Eliminated
            </div>
          </div>
          <button 
            onClick={onDismiss}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: '0 8px' }}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
