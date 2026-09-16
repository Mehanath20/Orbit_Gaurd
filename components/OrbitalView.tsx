'use client';

import { useRef, useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { ClosestApproachResult } from '../lib/types';
import { PRIMARY_SATELLITE, DEBRIS_OBJECTS } from '../lib/dataset';
import { getOrbitPoints } from '../lib/orbitEngine';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ff2d55',
  HIGH: '#ff9500',
  MODERATE: '#ffd60a',
  LOW: '#30d158',
};

/* ── Realistic 3D Earth ─────────────────────────────────────────── */
function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  const [textures, setTextures] = useState<{
    map: THREE.Texture | null;
    bumpMap: THREE.Texture | null;
    roughnessMap: THREE.Texture | null;
    cloudsMap: THREE.Texture | null;
  }>({
    map: null,
    bumpMap: null,
    roughnessMap: null,
    cloudsMap: null,
  });

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/earth-blue-marble.jpg', (map) => {
      map.colorSpace = THREE.SRGBColorSpace;
      setTextures((prev) => ({ ...prev, map }));
    });
    loader.load('/textures/earth-topology.png', (bumpMap) => {
      setTextures((prev) => ({ ...prev, bumpMap }));
    });
    loader.load('/textures/earth-water.png', (roughnessMap) => {
      setTextures((prev) => ({ ...prev, roughnessMap }));
    });
    loader.load('/textures/earth-clouds.png', (cloudsMap) => {
      setTextures((prev) => ({ ...prev, cloudsMap }));
    });
  }, []);

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.03;
    }
    if (cloudsRef.current) {
      // Dynamic cloud layer with realistic parallax drift
      cloudsRef.current.rotation.y += delta * 0.042;
      cloudsRef.current.rotation.x += delta * 0.003;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.03;
    }
  });

  return (
    <group>
      {/* 1. Earth Sphere (Day texture, bump relief & ocean specular) */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={textures.map || undefined}
          bumpMap={textures.bumpMap || undefined}
          bumpScale={0.06}
          roughnessMap={textures.roughnessMap || undefined}
          roughness={0.65}
          metalness={0.12}
          color={textures.map ? '#ffffff' : '#1e3a8a'}
        />
      </mesh>

      {/* 2. Cloud Layer with Parallax Rotation */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.025, 64, 64]} />
        {textures.cloudsMap ? (
          <meshStandardMaterial
            map={textures.cloudsMap}
            transparent={true}
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        ) : null}
      </mesh>

      {/* 3. Outer Atmospheric Haze & Rayleigh Scattering */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial
          color="#00b4d8"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Subtle Inner Atmospheric Rim */}
      <mesh>
        <sphereGeometry args={[2.04, 32, 32]} />
        <meshBasicMaterial
          color="#48cae4"
          transparent
          opacity={0.05}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

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

/* ── Satellite Marker (ISRO-SAT1) ────────────────────────────────── */
function SatelliteMarker({
  orbitPoints,
  onPositionUpdate,
}: {
  orbitPoints: THREE.Vector3[];
  onPositionUpdate: (pos: THREE.Vector3) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta * 0.06; // orbital speed
    if (orbitPoints.length === 0) return;

    const t = timeRef.current % 1;
    const idx = Math.floor(t * orbitPoints.length);
    const pos = orbitPoints[idx % orbitPoints.length];

    if (meshRef.current && pos) {
      meshRef.current.position.copy(pos);
      onPositionUpdate(pos.clone());
    }
    if (lightRef.current && pos) {
      lightRef.current.position.copy(pos);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={1.0}
        />
      </mesh>
      <pointLight ref={lightRef} color="#00d4ff" intensity={0.8} distance={2} />
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
}: {
  orbitPoints: THREE.Vector3[];
  result: ClosestApproachResult;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onPositionUpdate: (id: string, pos: THREE.Vector3) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(Math.random()); // stagger start position
  const [hovered, setHovered] = useState(false);

  const color = RISK_COLORS[result.riskLevel] || '#ffffff';
  const scale = isSelected ? 2 : hovered ? 1.5 : 1;

  useFrame((_, delta) => {
    timeRef.current += delta * (0.05 + Math.random() * 0.001);
    if (orbitPoints.length === 0) return;

    const t = timeRef.current % 1;
    const idx = Math.floor(t * orbitPoints.length);
    const pos = orbitPoints[idx % orbitPoints.length];

    if (meshRef.current && pos) {
      meshRef.current.position.lerp(pos, 0.2);
      onPositionUpdate(result.debrisId, pos.clone());
    }
  });

  return (
    <mesh
      ref={meshRef}
      scale={[scale, scale, scale]}
      onPointerOver={() => {
        setHovered(true);
        onHover(result.debrisId);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
      }}
      onClick={() => onSelect(result.debrisId)}
    >
      <sphereGeometry args={[0.025, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isSelected ? 1.0 : 0.7}
      />
      {(hovered || isSelected) && (
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(0,0,0,0.85)',
              border: `1px solid ${color}`,
              borderRadius: 6,
              padding: '4px 8px',
              color,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
            }}
          >
            {result.debrisName}
            <br />
            <span style={{ color: '#fff' }}>{result.minDistance_km.toFixed(2)} km</span>
          </div>
        </Html>
      )}
    </mesh>
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
}: {
  selectedPos: THREE.Vector3 | null;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 6));

  useFrame(() => {
    if (selectedPos) {
      const desiredPos = selectedPos.clone().normalize().multiplyScalar(6);
      targetRef.current.lerp(desiredPos, 0.02);
    } else {
      targetRef.current.lerp(new THREE.Vector3(0, 0, 6), 0.01);
    }
    camera.position.lerp(targetRef.current, 0.05);
  });

  return null;
}

/* ── Main Scene ────────────────────────────────────────────────────── */
interface SceneProps {
  results: ClosestApproachResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSatPosUpdate: (pos: THREE.Vector3) => void;
}

function OrbitalScene({ results, selectedId, onSelect, onSatPosUpdate }: SceneProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const debrisPosMap = useRef<Map<string, THREE.Vector3>>(new Map());
  const satPos = useRef<THREE.Vector3 | null>(null);

  // Compute orbit points for all objects
  const satOrbitPoints = useMemo(
    () => getOrbitPoints(PRIMARY_SATELLITE.tle1, PRIMARY_SATELLITE.tle2, 360),
    []
  );

  const debrisOrbitPoints = useMemo(() => {
    return DEBRIS_OBJECTS.map((d) => ({
      id: d.id,
      points: getOrbitPoints(d.tle1, d.tle2, 360),
    }));
  }, []);

  const handleSatPos = useCallback(
    (pos: THREE.Vector3) => {
      satPos.current = pos;
      onSatPosUpdate(pos);
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

      <Earth />
      <Stars radius={200} depth={60} count={3000} factor={4} saturation={0} fade />

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
              onHover={setHoveredId}
              onSelect={onSelect}
              onPositionUpdate={handleDebrisPos}
            />
          </group>
        );
      })}

      {/* Closest approach visualization */}
      <ClosestApproachViz
        satPos={satPos.current}
        debrisPos={selectedPos || criticalPos}
      />

      {/* Camera + controls */}
      <CameraController selectedPos={selectedPos} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={20}
        enablePan={false}
      />
    </>
  );
}

/* ── Overlay UI Cards ────────────────────────────────────────────── */
interface OverlayProps {
  results: ClosestApproachResult[];
  selectedId: string | null;
}

function OverlayUI({ results, selectedId }: OverlayProps) {
  const selected = results.find((r) => r.debrisId === selectedId);

  return (
    <>
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
        ← Drag to rotate · Scroll to zoom · Click debris to track →
      </div>
    </>
  );
}

/* ── Main Export ─────────────────────────────────────────────────── */
interface OrbitalViewProps {
  results: ClosestApproachResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function OrbitalView({ results, selectedId, onSelect }: OrbitalViewProps) {
  const [satPos, setSatPos] = useState<THREE.Vector3 | null>(null);
  const [webglOk, setWebglOk] = useState(true);

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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#000000' }}
      >
        <Suspense fallback={null}>
          <OrbitalScene
            results={results}
            selectedId={selectedId}
            onSelect={onSelect}
            onSatPosUpdate={setSatPos}
          />
        </Suspense>
      </Canvas>

      <OverlayUI results={results} selectedId={selectedId} />
    </div>
  );
}
