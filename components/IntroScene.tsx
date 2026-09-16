'use client';

import { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Earth Mesh ───────────────────────────────────────────────── */
function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [earthTexture, setEarthTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      (tex) => setEarthTexture(tex),
      undefined,
      () => setEarthTexture(null)
    );
  }, []);

  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.0008;
    if (atmosphereRef.current) atmosphereRef.current.rotation.y += 0.0008;
  });

  return (
    <group>
      {/* Earth sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        {earthTexture ? (
          <meshStandardMaterial map={earthTexture} />
        ) : (
          <meshStandardMaterial color="#1a3a5c" roughness={0.8} metalness={0.1} />
        )}
      </mesh>
      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[2.05, 64, 64]} />
        <meshBasicMaterial
          color="#00aaff"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

/* ── Debris Particle with trail ───────────────────────────────── */
function DebrisParticle({ index }: { index: number }) {
  const particleRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Line>(null);
  const positions = useRef<THREE.Vector3[]>([]);
  const MAX_TRAIL = 20;

  const radius = 2.4 + Math.random() * 0.8;
  const speed = 0.003 + Math.random() * 0.005;
  const inclination = ((Math.random() - 0.5) * Math.PI) / 2;
  const initialAngle = (index / 40) * Math.PI * 2;
  const color = Math.random() > 0.5 ? '#ff6b35' : '#ff2d55';

  const trailPositions = useRef(new Float32Array(MAX_TRAIL * 3));
  const trailGeo = useRef(new THREE.BufferGeometry());

  useEffect(() => {
    trailGeo.current.setAttribute(
      'position',
      new THREE.BufferAttribute(trailPositions.current, 3)
    );
    // Initialize all to same position
    for (let i = 0; i < MAX_TRAIL * 3; i++) trailPositions.current[i] = 0;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = initialAngle + t * speed;
    const x = radius * Math.cos(angle) * Math.cos(inclination);
    const y = radius * Math.sin(inclination);
    const z = radius * Math.sin(angle) * Math.cos(inclination);

    if (particleRef.current) {
      particleRef.current.position.set(x, y, z);
    }

    // Update trail
    const currentPos = new THREE.Vector3(x, y, z);
    positions.current.push(currentPos.clone());
    if (positions.current.length > MAX_TRAIL) positions.current.shift();

    // Write trail positions
    positions.current.forEach((p, i) => {
      trailPositions.current[i * 3] = p.x;
      trailPositions.current[i * 3 + 1] = p.y;
      trailPositions.current[i * 3 + 2] = p.z;
    });

    if (trailRef.current) {
      const attr = trailRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      attr.needsUpdate = true;
      trailRef.current.geometry.setDrawRange(0, positions.current.length);
    }
  });

  const lineObj = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });
    const line = new THREE.Line(trailGeo.current, mat);
    (trailRef as React.MutableRefObject<THREE.Line | null>).current = line;
    return line;
  }, [color]);

  return (
    <group>
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <primitive object={lineObj} />
    </group>
  );
}

/* ── ISRO-SAT1 ─────────────────────────────────────────────────── */
function Satellite() {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = t * 0.006;
    const inclination = (51.6 * Math.PI) / 180;
    const x = 2.5 * Math.cos(angle) * Math.cos(inclination);
    const y = 2.5 * Math.sin(inclination) * Math.sin(angle * 0.3);
    const z = 2.5 * Math.sin(angle) * Math.cos(inclination);

    if (meshRef.current) meshRef.current.position.set(x, y, z);
    if (lightRef.current) lightRef.current.position.set(x, y, z);
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={0.8}
        />
      </mesh>
      <pointLight ref={lightRef} color="#00d4ff" intensity={0.5} distance={3} />
    </group>
  );
}

/* ── Orbit Rings ────────────────────────────────────────────────── */
function OrbitRings() {
  return (
    <group>
      {[2.4, 2.6, 2.8].map((radius, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.003, 8, 128]} />
          <meshBasicMaterial color="white" transparent opacity={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Camera Animation ───────────────────────────────────────────── */
function CameraRig() {
  const { camera } = useThree();
  const startTime = useRef(Date.now());

  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    // Pull back from z=8 to z=6 over 3 seconds
    const targetZ = THREE.MathUtils.lerp(8, 6, Math.min(elapsed / 3, 1));
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.02);
    // Subtle wobble
    camera.position.x = Math.sin(elapsed * 0.3) * 0.1;
    camera.position.y = Math.cos(elapsed * 0.2) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  useEffect(() => {
    camera.position.set(0, 0, 8);
  }, [camera]);

  return null;
}

/* ── Scene Content ──────────────────────────────────────────────── */
function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-5, -3, -2]} intensity={0.3} color="#0044ff" />
      <Earth />
      <OrbitRings />
      <Satellite />
      {Array.from({ length: 40 }, (_, i) => (
        <DebrisParticle key={i} index={i} />
      ))}
      <Stars radius={200} depth={60} count={3000} factor={4} saturation={0} fade />
      <CameraRig />
    </>
  );
}

/* ── Main IntroScene ─────────────────────────────────────────────── */
interface IntroSceneProps {
  onEnter: () => void;
}

export default function IntroScene({ onEnter }: IntroSceneProps) {
  const [canvasOpacity, setCanvasOpacity] = useState(1);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!ctx) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  const handleEnter = () => {
    setCanvasOpacity(0);
    setOverlayVisible(false);
    setTimeout(onEnter, 800);
  };

  if (!webglSupported) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          zIndex: 100,
        }}
      >
        {/* Fallback static orbital diagram */}
        <svg width="300" height="300" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="60" fill="#1a3a5c" stroke="#00aaff" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="150" cy="150" r="85" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <circle cx="150" cy="150" r="100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <circle cx="235" cy="150" r="4" fill="#00d4ff" />
          <circle cx="150" cy="55" r="3" fill="#ff6b35" />
          <circle cx="58" cy="170" r="2" fill="#ff2d55" />
        </svg>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 48, fontWeight: 800 }}>
          ORBIT<span style={{ color: '#00d4ff' }}>GUARD</span>
        </h1>
        <button className="btn-cyan" onClick={handleEnter}>
          INITIALIZE THREAT ANALYSIS →
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Three.js Canvas */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          opacity: canvasOpacity,
          transition: 'opacity 800ms ease',
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 8], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#000000' }}
        >
          <Suspense fallback={null}>
            <SceneContent />
          </Suspense>
        </Canvas>
      </div>

      {/* Overlay Text */}
      <AnimatePresence>
        {overlayVisible && (
          <div className="intro-overlay" style={{ zIndex: 60 }}>
            {/* Department tag */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: 'rgba(0,212,255,0.7)',
                letterSpacing: '0.2em',
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              DEPARTMENT OF SPACE · ISRO · PS09
            </motion.div>

            {/* Main title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: 'clamp(48px, 8vw, 80px)',
                fontWeight: 800,
                letterSpacing: '0.05em',
                lineHeight: 1,
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              <span style={{ color: '#ffffff' }}>ORBIT</span>
              <span style={{ color: '#00d4ff' }}>GUARD</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.8 }}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 18,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              Space Debris Collision Risk Estimator
            </motion.p>

            {/* Disclaimer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4, duration: 0.8 }}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: 'rgba(255,149,0,0.6)',
                marginBottom: 40,
                textAlign: 'center',
                maxWidth: 480,
                lineHeight: 1.6,
              }}
            >
              ⚠ All outputs are approximate. Full perturbation modeling not included.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.2, duration: 0.8 }}
            >
              <motion.button
                onClick={handleEnter}
                className="btn-cyan"
                style={{
                  padding: '14px 32px',
                  fontSize: 13,
                  letterSpacing: '0.12em',
                }}
                animate={{
                  boxShadow: [
                    '0 0 12px rgba(0,212,255,0.15)',
                    '0 0 30px rgba(0,212,255,0.4)',
                    '0 0 12px rgba(0,212,255,0.15)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                whileHover={{
                  background: 'rgba(0,212,255,0.1)',
                  boxShadow: '0 0 40px rgba(0,212,255,0.5)',
                }}
              >
                INITIALIZE THREAT ANALYSIS →
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
