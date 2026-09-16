'use client';

import { useRef, useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ClosestApproachResult } from '../lib/types';
import { PRIMARY_SATELLITE, DEBRIS_OBJECTS } from '../lib/dataset';
import { getOrbitPoints } from '../lib/orbitEngine';
import SolarSystemBackground from './SolarSystemBackground';
import InterceptSequence from './InterceptSequence';
import Satellite from './models/Satellite';
import DebrisObject from './models/DebrisObject';
import Earth from './models/Earth';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ff2d55',
  HIGH: '#ff9500',
  MODERATE: '#ffd60a',
  LOW: '#30d158',
};

/* ── Realistic 3D Earth moved to components/models/Earth.tsx ── */

/* ── Orbit Path Line ────────────────────────────────────────────── */
function OrbitPath({
  points,
  color,
  opacity,
}: {
  points: THREE.Vector3[];
  color: string;
  opacity: number;
}) {
  if (points.length < 2) return null;
  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      transparent
      opacity={opacity}
    />
  );
}

// Removed RealisticSatellite (now in components/models/Satellite.tsx)

/* ── Satellite Marker (ISRO-SAT1) ───────────────────────────────── */
function SatelliteMarker({
  orbitPoints,
  onPositionUpdate,
  isSelected,
  onSelect,
  onHover,
}: {
  orbitPoints: THREE.Vector3[];
  onPositionUpdate: (pos: THREE.Vector3) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const timeRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    timeRef.current += delta * 0.06;
    if (orbitPoints.length === 0) return;
    const t = timeRef.current % 1;
    const idx = Math.floor(t * orbitPoints.length);
    const pos = orbitPoints[idx % orbitPoints.length];
    const nextIdx = (idx + 1) % orbitPoints.length;
    const nextPos = orbitPoints[nextIdx];
    if (groupRef.current && pos) {
      groupRef.current.position.copy(pos);
      if (nextPos) { groupRef.current.lookAt(nextPos); groupRef.current.rotateX(-Math.PI / 4); }
      onPositionUpdate(pos.clone());
    }
    if (lightRef.current && pos) lightRef.current.position.copy(pos);
  });

  return (
    <group ref={groupRef}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  onHover?.('satellite'); }}
      onPointerOut={(e)  => { e.stopPropagation(); setHovered(false); onHover?.(null); }}
    >
      <OrbitPath points={orbitPoints.slice(0, 30)} color="#00d4ff" opacity={0.4} />
      <Satellite
        position={orbitPoints[0]}
        isSelected={isSelected}
        isHovered={hovered}
        onClick={() => onSelect('satellite')}
      />
    </group>
  );
}


/* ── Debris Marker ────────────────────────────────────────────────── */
function DebrisMarker({
  orbitPoints,
  result,
  isSelected,
  onHover,
  onSelect,
  onPositionUpdate,
  isTargeted,
}: {
  orbitPoints: THREE.Vector3[];
  result: ClosestApproachResult;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onPositionUpdate: (id: string, pos: THREE.Vector3) => void;
  isTargeted?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(Math.random()); // stagger start position
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    // Increase speed 3x if targeted for dramatic effect
    const speed = isTargeted ? (0.05 + Math.random() * 0.001) * 3 : (0.05 + Math.random() * 0.001);
    timeRef.current += delta * speed;
    if (orbitPoints.length === 0) return;

    const t = timeRef.current % 1;
    const idx = Math.floor(t * orbitPoints.length);
    const pos = orbitPoints[idx % orbitPoints.length];

    if (groupRef.current && pos) {
      groupRef.current.position.lerp(pos, 0.2);
      onPositionUpdate(result.debrisId, pos.clone());
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(result.debrisId);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(result.debrisId);
      }}
    >
      <DebrisObject
        type={result.objectType}
        riskLevel={result.riskLevel}
        distanceKm={result.minDistance_km}
        name={result.debrisName}
        isSelected={isSelected}
        isHovered={hovered}
      />
    </group>
  );
}

/* ── Closest Approach Visualization ───────────────────────────────── */
function ClosestApproachViz({
  satPos,
  debrisPos,
}: {
  satPos: THREE.Vector3 | null;
  debrisPos: THREE.Vector3 | null;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const [lineOpacity, setLineOpacity] = useState(0.5);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Pulse scale
    if (sphereRef.current) {
      const pulse = 1.0 + 0.5 * Math.sin((t / 1.5) * Math.PI * 2);
      sphereRef.current.scale.setScalar(pulse);
    }
    // Pulse line opacity
    const opPulse = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin((t / 2) * Math.PI * 2));
    setLineOpacity(opPulse);
  });

  if (!satPos || !debrisPos) return null;

  const midpoint = satPos.clone().add(debrisPos).multiplyScalar(0.5);

  return (
    <group>
      {/* Pulsing red sphere at midpoint */}
      <mesh ref={sphereRef} position={midpoint}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#ff2d55" transparent opacity={0.8} />
      </mesh>
      {/* Connection line */}
      <Line
        points={[satPos, debrisPos]}
        color="#ff2d55"
        lineWidth={1}
        transparent
        opacity={lineOpacity}
        dashed
        dashSize={0.05}
        gapSize={0.05}
      />
    </group>
  );
}

/* ── Camera Controller ────────────────────────────────────────────── */
function CameraController({
  selectedPos,
  viewMode,
  satPos,
}: {
  selectedPos: THREE.Vector3 | null;
  viewMode: 'EARTH' | 'ORRERY' | 'SAT';
  satPos: THREE.Vector3 | null;
}) {
  const { camera } = useThree();
  const targetCamPos = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (selectedPos) {
      // Pull camera further back so the Earth isn't just a massive wall blocking the view
      targetCamPos.current = selectedPos.clone().add(new THREE.Vector3(3.5, 2.5, 4.5));
    } else if (viewMode === 'ORRERY') {
      targetCamPos.current = new THREE.Vector3(22, 34, 46);
    } else if (viewMode === 'EARTH') {
      targetCamPos.current = new THREE.Vector3(0, 2.2, 7.2);
    } else if (viewMode === 'SAT' && satPos) {
      targetCamPos.current = satPos.clone().add(new THREE.Vector3(0.6, 0.6, 1.4));
    }
  }, [viewMode, selectedPos, satPos]);

  useFrame(() => {
    if (targetCamPos.current) {
      camera.position.lerp(targetCamPos.current, 0.04);
      if (camera.position.distanceTo(targetCamPos.current) < 0.2) {
        targetCamPos.current = null;
      }
    }
    // Access controls via state if makeDefault is set on OrbitControls
    const controls = (camera as any).controls; 
    // Fallback: manually find OrbitControls if not registered
    const orbitControls = controls || (window as any)._orbitControls;
    if (orbitControls) {
      const targetLook = selectedPos ? selectedPos.clone() : new THREE.Vector3(0, 0, 0);
      orbitControls.target.lerp(targetLook, 0.04);
      orbitControls.update();
    }
  });

  return null;
}

/* ── Main Scene ────────────────────────────────────────────────────── */
interface SceneProps {
  results: ClosestApproachResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSatPosUpdate?: (pos: THREE.Vector3) => void;
  viewMode?: 'EARTH' | 'ORRERY' | 'SAT';
  interceptTargetId?: string | null;
  onInterceptComplete?: () => void;
  isImpacted?: boolean;
  extraDebris?: import('../lib/types').DebrisObject[];
  onHoverChange?: (info: { id: string; label: string; sub: string; color: string } | null) => void;
}

function EarthImpactSequence() {
  const explosionRef = useRef<THREE.Points>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const startTime = useRef(Date.now());
  const particlesCount = 2000;
  
  const [initialPos] = useState(() => {
    const pos = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount; i++) {
      const r = Math.random() * 0.5;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  });

  useFrame(() => {
    const t = (Date.now() - startTime.current) / 5000;
    if (explosionRef.current) {
      const positionsAttr = explosionRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particlesCount; i++) {
        // Expand rapidly then slow down
        const expansion = Math.max(0.01, (1 - t) * 0.2);
        positionsAttr.array[i * 3] += positionsAttr.array[i * 3] * expansion;
        positionsAttr.array[i * 3 + 1] += positionsAttr.array[i * 3 + 1] * expansion;
        positionsAttr.array[i * 3 + 2] += positionsAttr.array[i * 3 + 2] * expansion;
      }
      positionsAttr.needsUpdate = true;
      (explosionRef.current.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - t * 0.5);
    }
    if (flashLightRef.current) {
      flashLightRef.current.intensity = Math.max(0, 50 * (1 - t * 2));
    }
  });

  return (
    <group position={[0,0,0]}>
      <points ref={explosionRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particlesCount} array={initialPos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.15} color="#ff3300" transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation={true} />
      </points>
      <pointLight ref={flashLightRef} color="#ffaa00" intensity={50} distance={100} />
      <Html center zIndexRange={[100, 0]}>
        <div style={{
          background: 'rgba(255,45,85,0.4)', width: '100vw', height: '100vh', position: 'fixed',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9999,
          animation: 'flash-fade 1s ease-out forwards'
        }} />
      </Html>
    </group>
  );
}

function OrbitalScene({
  results,
  selectedId,
  onSelect,
  onSatPosUpdate,
  viewMode = 'ORRERY',
  interceptTargetId,
  onInterceptComplete,
  isImpacted = false,
  extraDebris = [],
  onHoverChange,
}: SceneProps) {
  const RISK_COLORS_LOCAL: Record<string, string> = {
    CRITICAL: '#ff2d55', HIGH: '#ff9500', MODERATE: '#ffd60a', LOW: '#30d158',
  };
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const debrisPosMap = useRef<Map<string, THREE.Vector3>>(new Map());
  const satPos = useRef<THREE.Vector3 | null>(null);

  // Notify parent of hover info changes
  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
    if (!id) { onHoverChange?.(null); return; }
    if (id === 'satellite') {
      onHoverChange?.({ id: 'satellite', label: 'ISRO-SAT1', sub: 'LEO · Alt 408 km · 7.66 km/s\nInclination 51.6° · Active', color: '#00d4ff' });
      return;
    }
    const r = results.find(x => x.debrisId === id);
    if (r) {
      onHoverChange?.({
        id,
        label: r.debrisName,
        sub: `${r.objectType} · NORAD ${r.noradId ?? 'N/A'}\nClosest: ${r.minDistance_km.toFixed(1)} km`,
        color: RISK_COLORS_LOCAL[r.riskLevel] || '#ffffff',
      });
    }
  }, [onHoverChange, results]);

  // Compute orbit points for all objects
  const satOrbitPoints = useMemo(
    () => getOrbitPoints(PRIMARY_SATELLITE.tle1, PRIMARY_SATELLITE.tle2, 360),
    []
  );

  const debrisOrbitPoints = useMemo(() => {
    return [...DEBRIS_OBJECTS, ...extraDebris].map((d) => ({
      id: d.id,
      points: getOrbitPoints(d.tle1, d.tle2, 360),
    }));
  }, [extraDebris]);

  const handleSatPos = useCallback(
    (pos: THREE.Vector3) => {
      satPos.current = pos;
      if (onSatPosUpdate) onSatPosUpdate(pos);
    },
    [onSatPosUpdate]
  );

  const handleDebrisPos = useCallback((id: string, pos: THREE.Vector3) => {
    debrisPosMap.current.set(id, pos);
  }, []);

  // Find CRITICAL/HIGH debris for the connection line
  const criticalResult = results.find(
    (r) => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH'
  );
  const criticalPos = criticalResult
    ? debrisPosMap.current.get(criticalResult.debrisId) || null
    : null;

  const selectedPos = selectedId ? debrisPosMap.current.get(selectedId) || null : null;

  return (
    <>
      <ambientLight intensity={0.45} color="#dbeafe" />
      <directionalLight position={[10, 6, 8]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-10, -3, -6]} intensity={0.4} color="#38bdf8" />
      <pointLight position={[0, 8, 2]} intensity={0.3} color="#00d4ff" />

      {/* 3D Solar System (Sun, Moon, Mars, Jupiter, Saturn, Asteroid Belt, Stars, Nebulae) */}
      <SolarSystemBackground onSelectPlanet={onSelect} />

      {!isImpacted && <Earth />}
      {isImpacted && <EarthImpactSequence />}

      {/* ISRO-SAT1 orbit path */}
      <OrbitPath
        points={satOrbitPoints}
        color="#00d4ff"
        opacity={0.4}
      />

      {/* ISRO-SAT1 marker */}
      <SatelliteMarker
        orbitPoints={satOrbitPoints}
        onPositionUpdate={handleSatPos}
        isSelected={selectedId === 'PRIMARY_SATELLITE'}
        onSelect={onSelect}
        onHover={handleHover}
      />

      {/* Debris orbit paths and markers */}
      {results.map((result) => {
        const orbitData = debrisOrbitPoints.find((d) => d.id === result.debrisId);
        if (!orbitData) return null;
        return (
          <group key={result.debrisId}>
            <OrbitPath
              points={orbitData.points}
              color={RISK_COLORS[result.riskLevel] || '#ffffff'}
              opacity={0.15}
            />
            <DebrisMarker
              orbitPoints={orbitData.points}
              result={result}
              isSelected={selectedId === result.debrisId}
              onHover={handleHover}
              onSelect={onSelect}
              onPositionUpdate={handleDebrisPos}
              isTargeted={interceptTargetId === result.debrisId}
            />
          </group>
        );
      })}

      {/* Intercept Sequence */}
      {interceptTargetId && (
        <InterceptSequence 
          debrisPos={debrisPosMap.current.get(interceptTargetId) || null} 
          onComplete={() => {
            if (onInterceptComplete) onInterceptComplete();
          }} 
        />
      )}

      {/* Closest approach visualization */}
      <ClosestApproachViz
        satPos={satPos.current}
        debrisPos={selectedPos || criticalPos}
      />

      {/* Camera + controls */}
      <CameraController selectedPos={selectedPos} viewMode={viewMode} satPos={satPos.current} />
      <OrbitControls
        makeDefault // Registers controls so we can access via useThree().controls or camera.controls
        ref={(c) => { if (c) (window as any)._orbitControls = c; }}
        enableDamping
        dampingFactor={0.06}
        minDistance={2.5}
        maxDistance={250}
        enablePan={true}
        autoRotate={true}
        autoRotateSpeed={0.7}
      />
    </>
  );
}

/* ── Overlay UI Cards ────────────────────────────────────────────── */
interface OverlayProps {
  results: ClosestApproachResult[];
  selectedId: string | null;
  viewMode: 'EARTH' | 'ORRERY' | 'SAT';
  onViewModeChange: (m: 'EARTH' | 'ORRERY' | 'SAT') => void;
}

function OverlayUI({ results, selectedId, viewMode, onViewModeChange }: OverlayProps) {
  const selected = results.find((r) => r.debrisId === selectedId);

  return (
    <>
      {/* Center Top: View Mode Switcher */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(16px)',
          padding: '4px 6px',
          borderRadius: 9999,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <button
          onClick={() => onViewModeChange('ORRERY')}
          className={`btn-pill ${viewMode === 'ORRERY' ? 'active' : 'btn-pill-blink'}`}
          style={{ fontSize: 9.5, padding: '4px 12px' }}
        >
          🪐 SOLAR SYSTEM
        </button>
        <button
          onClick={() => onViewModeChange('EARTH')}
          className={`btn-pill ${viewMode === 'EARTH' ? 'active' : ''}`}
          style={{ fontSize: 9.5, padding: '4px 12px' }}
        >
          🌍 EARTH FOCUS
        </button>
        <button
          onClick={() => onViewModeChange('SAT')}
          className={`btn-pill ${viewMode === 'SAT' ? 'active' : 'btn-pill-blink'}`}
          style={{ fontSize: 9.5, padding: '4px 12px' }}
        >
          🛰️ SATELLITE
        </button>
      </div>

      {/* Top-Left */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          minWidth: 180,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#00d4ff',
              boxShadow: '0 0 8px #00d4ff',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: '#00d4ff',
              letterSpacing: '0.1em',
            }}
          >
            LIVE ORBITAL SIMULATION
          </span>
        </div>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          ISRO-SAT1 · LEO · 408 km
        </div>
      </div>

      {/* Top-Right — selected object info */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${RISK_COLORS[selected.riskLevel]}40`,
            borderRadius: 12,
            minWidth: 200,
          }}
        >
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: RISK_COLORS[selected.riskLevel],
              marginBottom: 4,
            }}
          >
            {selected.debrisName}
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {selected.minDistance_km.toFixed(2)} km
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Min. separation
          </div>
        </div>
      )}

      {/* Bottom hint bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          padding: '8px 20px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 9999,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}
      >
        ← Drag to rotate/pan · Scroll to zoom · Click debris or modes to view →
      </div>
    </>
  );
}

/* ── Main Export ─────────────────────────────────────────────────── */
interface OrbitalViewProps {
  results: ClosestApproachResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  viewMode?: 'EARTH' | 'ORRERY' | 'SAT';
  interceptTargetId?: string | null;
  onInterceptComplete?: () => void;
}

export default function OrbitalView({
  results,
  selectedId,
  onSelect,
  viewMode: propViewMode = 'EARTH',
  interceptTargetId,
  onInterceptComplete,
  isImpacted,
  extraDebris = [],
}: OrbitalViewProps & { isImpacted?: boolean; extraDebris?: import('../lib/types').DebrisObject[] }) {
  const [satPos, setSatPos] = useState<THREE.Vector3 | null>(null);
  const [viewMode, setViewMode] = useState<'EARTH' | 'ORRERY' | 'SAT'>(propViewMode);
  const [webglOk, setWebglOk] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredInfo, setHoveredInfo] = useState<{ id: string; label: string; sub: string; color: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build a quick lookup for debris results
  const resultMap = useMemo(() => {
    const m: Record<string, ClosestApproachResult> = {};
    results.forEach(r => { m[r.debrisId] = r; });
    return m;
  }, [results]);

  // Track mouse position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    el.addEventListener('mousemove', handler);
    return () => el.removeEventListener('mousemove', handler);
  }, []);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const ctx = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!ctx) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  if (!webglOk) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        <svg width="400" height="400" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="80" fill="#1a3a5c" stroke="#00aaff" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="200" cy="200" r="110" fill="none" stroke="rgba(0,212,255,0.2)" strokeWidth="1" />
          <circle cx="200" cy="200" r="135" fill="none" stroke="rgba(255,45,85,0.2)" strokeWidth="1" />
          <circle cx="310" cy="200" r="5" fill="#00d4ff" />
          <circle cx="200" cy="70" r="4" fill="#ff2d55" />
          <circle cx="80" cy="230" r="3" fill="#ff9500" />
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [22, 34, 46], fov: 45 }}
        gl={{ 
          antialias: true, 
          alpha: false, 
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        style={{ background: '#000000' }}
        onPointerMissed={() => setHoveredInfo(null)}
      >
        <Suspense fallback={null}>
          <OrbitalScene
            results={results}
            selectedId={selectedId}
            onSelect={(id) => {
              if (id === 'satellite') { onSelect('satellite'); } else { onSelect(id); }
            }}
            onSatPosUpdate={setSatPos}
            viewMode={viewMode}
            interceptTargetId={interceptTargetId}
            onInterceptComplete={onInterceptComplete}
            isImpacted={isImpacted}
            extraDebris={extraDebris}
            onHoverChange={setHoveredInfo}
          />
          <EffectComposer>
            <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.9} intensity={1.5} mipmapBlur={true} />
            {/* @ts-expect-error - missing properties in current type definitions */}
            <ChromaticAberration offset={new THREE.Vector2(0.0005, 0.0005)} />
            <Noise opacity={0.025} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <OverlayUI
        results={results}
        selectedId={selectedId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Cursor Tooltip */}
      {hoveredInfo && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x + 18,
            top: mousePos.y + 14,
            zIndex: 9999,
            pointerEvents: 'none',
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${hoveredInfo.color}66`,
            borderRadius: 10,
            padding: '10px 14px',
            minWidth: 180,
            boxShadow: `0 4px 24px ${hoveredInfo.color}33, 0 2px 8px rgba(0,0,0,0.8)`,
          }}
        >
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: hoveredInfo.color, marginBottom: 4 }}>
            {hoveredInfo.id === 'satellite' ? '🛰' : '☄'} {hoveredInfo.label}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
            {hoveredInfo.sub}
          </div>
          {hoveredInfo.id !== 'satellite' && resultMap[hoveredInfo.id] && (
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, background: `${hoveredInfo.color}22`, border: `1px solid ${hoveredInfo.color}55`, borderRadius: 4, padding: '1px 6px', color: hoveredInfo.color }}>
                {resultMap[hoveredInfo.id].riskLevel}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 6px', color: 'rgba(255,255,255,0.6)' }}>
                {resultMap[hoveredInfo.id].minDistance_km.toFixed(1)} km
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 6px', color: 'rgba(255,255,255,0.6)' }}>
                {resultMap[hoveredInfo.id].objectType}
              </span>
            </div>
          )}
          <div style={{ marginTop: 6, fontFamily: 'Inter, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
            {hoveredInfo.id === 'satellite' ? 'Click to focus • Satellite view available' : 'Click to inspect • Click Intercept to neutralize'}
          </div>
        </div>
      )}
    </div>
  );
}
