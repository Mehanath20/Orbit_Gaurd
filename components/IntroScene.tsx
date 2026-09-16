'use client';

import { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Sparkles, Stars, Line } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import SolarSystemBackground from './SolarSystemBackground';
import SatelliteModel from './models/Satellite';
import DebrisObject from './models/DebrisObject';

/* ── Shaders ──────────────────────────────────────────────────── */
const EARTH_VERT = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EARTH_FRAG = `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uClouds;
  uniform vec3 uSunDir;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    float sunDot  = dot(normalize(vNormal), normalize(uSunDir));
    float dayMix  = smoothstep(-0.2, 0.25, sunDot);
    vec4 dayCol   = texture2D(uDay, vUv);
    vec4 nightCol = texture2D(uNight, vUv);
    vec4 nightLit = nightCol * 3.0;
    vec2 cloudUv  = vUv + vec2(uTime * 0.004, 0.0);
    float cloud   = texture2D(uClouds, cloudUv).r;
    vec4 earth    = mix(nightLit, dayCol, dayMix);
    float oceanMask = smoothstep(0.3, 0.7, dayCol.b - max(dayCol.r, dayCol.g) * 0.5);
    float spec      = pow(max(sunDot, 0.0), 50.0) * oceanMask * 0.7;
    earth.rgb      += vec3(0.7, 0.85, 1.0) * spec * dayMix;
    vec3 cloudCol   = mix(vec3(0.05,0.05,0.08), vec3(1.0), dayMix);
    earth.rgb       = mix(earth.rgb, cloudCol, cloud * 0.4 * max(dayMix, 0.05));
    float rim       = pow(1.0 - abs(sunDot), 6.0) * smoothstep(-0.1, 0.2, sunDot);
    earth.rgb      += vec3(1.0, 0.5, 0.15) * rim * 0.6;
    vec3 viewDir    = normalize(cameraPosition - vWorldPosition);
    float fresnel   = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.5);
    earth.rgb       = mix(earth.rgb, vec3(0.25, 0.55, 1.0), fresnel * 0.28 * max(sunDot + 0.3, 0.0));
    gl_FragColor    = earth;
  }
`;

const ATMO_FRAG = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform vec3 uSunDir;
  void main() {
    vec3 viewDir    = normalize(cameraPosition - vWorldPosition);
    float rim       = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.8);
    float sunFacing = dot(normalize(vNormal), normalize(uSunDir));
    float dayFactor = smoothstep(-0.3, 0.6, sunFacing);
    vec3 day        = vec3(0.25, 0.58, 1.0);
    vec3 night      = vec3(0.02, 0.04, 0.14);
    vec3 col        = mix(night, day, dayFactor);
    float term      = pow(1.0 - abs(sunFacing), 5.0) * smoothstep(-0.1, 0.2, sunFacing);
    col             = mix(col, vec3(1.0, 0.45, 0.1), term * 0.55);
    gl_FragColor    = vec4(col, rim * 0.65);
  }
`;

const SUN_DIR_INTRO = new THREE.Vector3(6, 3, 5).normalize();

/* ── Earth Mesh ───────────────────────────────────────────────── */
function Earth() {
  const meshRef   = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const outerRef  = useRef<THREE.Mesh>(null);

  const [dayTex,   setDayTex]   = useState<THREE.Texture | null>(null);
  const [nightTex, setNightTex] = useState<THREE.Texture | null>(null);
  const [cloudTex, setCloudTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/earth-blue-marble.jpg', (t) => { t.colorSpace = THREE.SRGBColorSpace; setDayTex(t); });
    loader.load('/textures/earth-night.jpg',       (t) => { t.colorSpace = THREE.SRGBColorSpace; setNightTex(t); });
    loader.load('/textures/earth-clouds.png',      (t) => { setCloudTex(t); });
  }, []);

  const uniforms = useMemo(() => ({
    uDay:    { value: null as THREE.Texture | null },
    uNight:  { value: null as THREE.Texture | null },
    uClouds: { value: null as THREE.Texture | null },
    uSunDir: { value: SUN_DIR_INTRO.clone() },
    uTime:   { value: 0 },
  }), []);

  useEffect(() => { uniforms.uDay.value    = dayTex;   }, [dayTex,   uniforms]);
  useEffect(() => { uniforms.uNight.value  = nightTex; }, [nightTex, uniforms]);
  useEffect(() => { uniforms.uClouds.value = cloudTex; }, [cloudTex, uniforms]);

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
    if (meshRef.current)   meshRef.current.rotation.y   += delta * 0.04;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.055;
    if (outerRef.current)  outerRef.current.rotation.y  += delta * 0.04;
  });

  return (
    <group>
      {/* Glow halo ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.18, 2.8, 128]} />
        <meshBasicMaterial color="#1a6fff" transparent opacity={0.07} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Earth surface */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 96, 96]} />
        {dayTex && nightTex ? (
          <shaderMaterial vertexShader={EARTH_VERT} fragmentShader={EARTH_FRAG} uniforms={uniforms} />
        ) : (
          <meshStandardMaterial color="#1e3a8a" />
        )}
      </mesh>



      {/* Inner atmospheric fringe */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[2.07, 64, 64]} />
        {dayTex ? (
          <shaderMaterial
            vertexShader={EARTH_VERT}
            fragmentShader={ATMO_FRAG}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        ) : (
          <meshBasicMaterial color="#00b4d8" transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
        )}
      </mesh>

      {/* Outer halo shell */}
      <mesh>
        <sphereGeometry args={[2.18, 64, 64]} />
        <meshBasicMaterial color="#1a5fff" transparent opacity={0.09} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Aurora sparkles at poles */}
      <Sparkles position={[0,  2.12, 0]} count={120} scale={[1.3, 0.25, 1.3]} size={1.2} speed={0.4} color="#00ff88" opacity={0.18} />
      <Sparkles position={[0, -2.12, 0]} count={120} scale={[1.3, 0.25, 1.3]} size={1.2} speed={0.4} color="#44aaff" opacity={0.18} />
    </group>
  );
}

/* ── Debris Particle with trail ───────────────────────────────── */
function DebrisParticle({ index }: { index: number }) {
  const particleRef = useRef<THREE.Group>(null);
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

  const type = Math.random() > 0.5 ? 'Fragment' : 'Unknown';
  const riskLevel = color === '#ff2d55' ? 'CRITICAL' : 'HIGH';

  return (
    <group>
      <group ref={particleRef}>
        <DebrisObject type={type} riskLevel={riskLevel} name={`Debris ${index}`} />
      </group>
      <primitive object={lineObj} />
    </group>
  );
}

/* ── ISRO-SAT1 ─────────────────────────────────────────────────── */
function Satellite() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = t * 0.006;
    const inclination = (51.6 * Math.PI) / 180;
    const x = 2.5 * Math.cos(angle) * Math.cos(inclination);
    const y = 2.5 * Math.sin(inclination) * Math.sin(angle * 0.3);
    const z = 2.5 * Math.sin(angle) * Math.cos(inclination);

    if (groupRef.current) groupRef.current.position.set(x, y, z);
  });

  return (
    <group ref={groupRef}>
      <SatelliteModel />
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
      <ambientLight intensity={0.45} color="#dbeafe" />
      <directionalLight position={[8, 5, 7]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-8, -2, -6]} intensity={0.4} color="#38bdf8" />
      <pointLight position={[0, 8, 2]} intensity={0.3} color="#00d4ff" />
      {/* 3D Solar System Background (Sun, Moon, Planets, Asteroid Belt, Cosmic Dust) */}
      <SolarSystemBackground hideLabels={true} />

      {/* Move Earth and its immediate orbit elements to the side so it doesn't block the main text */}
      <group position={[3.5, -0.5, -2]}>
        <Earth />
        <OrbitRings />
        <Satellite />
        {Array.from({ length: 40 }, (_, i) => (
          <DebrisParticle key={i} index={i} />
        ))}
      </group>
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
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              DEPARTMENT OF SPACE · ISRO
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
                textShadow: '0 4px 24px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,1)',
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
                color: 'rgba(255,255,255,0.7)',
                marginBottom: 16,
                textAlign: 'center',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              Space Debris Collision Risk Estimator
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
