'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ClosestApproachResult } from '../lib/types';

interface SummaryCardsProps {
  results: ClosestApproachResult[];
}

/* ── Count-up hook ─────────────────────────────────────────────── */
function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress >= 1) {
        clearInterval(timer);
        setValue(target);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return value;
}

/* ── Next Close Approach Timer ──────────────────────────────────── */
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeStr, setTimeStr] = useState('--:--:--');

  useEffect(() => {
    const update = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeStr('00:00:00');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeStr(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span>{timeStr}</span>;
}

/* ── Single Stat Card ──────────────────────────────────────────── */
function StatCard({
  label,
  value,
  accent,
  delay,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  delay: number;
}) {
  return (
    <motion.div
      className="glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        textAlign: 'center',
        cursor: 'default',
      }}
    >
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 8,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 24,
          fontWeight: 700,
          color: accent || '#ffffff',
          lineHeight: 1,
          ...(accent === '#ff2d55'
            ? { textShadow: '0 0 10px rgba(255,45,85,0.8)' }
            : {}),
        }}
      >
        {value}
      </div>
    </motion.div>
  );
}

/* ── Summary Cards ─────────────────────────────────────────────── */
export default function SummaryCards({ results }: SummaryCardsProps) {
  const totalTracked = useCountUp(results.length + 1); // +1 for ISRO-SAT1
  const criticalCount = useCountUp(
    results.filter((r) => r.riskLevel === 'CRITICAL').length
  );

  const nextCA = results.reduce<Date | null>((earliest, r) => {
    if (!earliest || r.timeOfClosestApproach < earliest) return r.timeOfClosestApproach;
    return earliest;
  }, null);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}
    >
      <StatCard
        label="Objects Tracked"
        value={totalTracked}
        delay={0.1}
      />
      <StatCard
        label="Critical Alerts"
        value={criticalCount}
        accent={criticalCount > 0 ? '#ff2d55' : '#30d158'}
        delay={0.2}
      />
      <StatCard
        label="Next Close Approach"
        value={
          nextCA ? (
            <CountdownTimer targetDate={nextCA} />
          ) : (
            '--:--:--'
          )
        }
        accent="#00d4ff"
        delay={0.3}
      />
      <StatCard
        label="Analysis Window"
        value="24 HRS"
        accent="#00d4ff"
        delay={0.4}
      />
    </div>
  );
}
