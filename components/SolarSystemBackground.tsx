'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Planetary Configuration ──────────────────────────────────── */
// Sun is placed such that Earth's orbit passes precisely through [0, 0, 0]
const SUN_POS = new THREE.Vector3(-32, -5, -28);
const R_EARTH = SUN_POS.clone().negate().length(); // ~42.81

interface PlanetDef {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  initialAngle: number;
  texturePath: string;
  color: string;
  tilt?: number;
  hasRings?: boolean;
  ringsInner?: number;
  ringsOuter?: number;
  moons?: { radius: number; dist: number; speed: number; color: string }[];
}

const PLANETS: PlanetDef[] = [
  {
    name: 'Mercury',
    radius: 0.45,
    orbitRadius: 14,
    orbitSpeed: 0.04,
    initialAngle: 1.2,
    texturePath: '/textures/mercury.jpg',
    color: '#94a3b8',
  },
  {
    name: 'Venus',
    radius: 0.85,
    orbitRadius: 25,
    orbitSpeed: 0.025,
    initialAngle: 3.8,
    texturePath: '/textures/venus.jpg',
    color: '#fef08a',
  },
  {
    name: 'Mars',
    radius: 0.65,
    orbitRadius: 56,
    orbitSpeed: 0.012,
    initialAngle: 4.5,
    texturePath: '/textures/mars.jpg',
    color: '#f87171',
    moons: [
      { radius: 0.05, dist: 1.1, speed: 0.4, color: '#a8a29e' },
      { radius: 0.04, dist: 1.5, speed: 0.25, color: '#78716c' },
    ],
  },
  {
    name: 'Jupiter',
    radius: 3.2,
    orbitRadius: 104,
    orbitSpeed: 0.005,
    initialAngle: 2.1,
    texturePath: '/textures/jupiter.jpg',
    color: '#fed7aa',
    moons: [
      { radius: 0.09, dist: 4.5, speed: 0.35, color: '#fef08a' }, // Io
      { radius: 0.08, dist: 5.8, speed: 0.25, color: '#e0f2fe' }, // Europa
      { radius: 0.12, dist: 7.2, speed: 0.18, color: '#cbd5e1' }, // Ganymede
      { radius: 0.11, dist: 8.8, speed: 0.12, color: '#94a3b8' }, // Callisto
    ],
  },
  {
    name: 'Saturn',
    radius: 2.4,
    orbitRadius: 136,
    orbitSpeed: 0.0032,
    initialAngle: 5.6,
    texturePath: '/textures/saturn.jpg',
    color: '#fde047',
    hasRings: true,
    ringsInner: 3.0,
    ringsOuter: 5.6,
    tilt: 0.45,
    moons: [
      { radius: 0.12, dist: 6.8, speed: 0.2, color: '#fdba74' }, // Titan
      { radius: 0.06, dist: 4.2, speed: 0.4, color: '#f1f5f9' }, // Enceladus
    ],
  },
  {
    name: 'Uranus',
    radius: 1.5,
    orbitRadius: 168,
    orbitSpeed: 0.002,
    initialAngle: 0.9,
    texturePath: '/textures/uranus.jpg',
    color: '#a5f3fc',
    tilt: 1.4,
  },
  {
    name: 'Neptune',
    radius: 1.45,
    orbitRadius: 198,
    orbitSpeed: 0.0014,
    initialAngle: 3.2,
    texturePath: '/textures/neptune.jpg',
    color: '#60a5fa',
    moons: [{ radius: 0.09, dist: 3.5, speed: -0.22, color: '#bfdbfe' }], // Triton
  },
  {
    name: 'Pluto',
    radius: 0.3,
    orbitRadius: 228,
    orbitSpeed: 0.0009,
    initialAngle: 1.8,
    texturePath: '/textures/asteroid.jpg',
    color: '#cbd5e1',
    tilt: 0.3,
  },
];

/* ── Orbit Ring Component ──────────────────────────────────────── */
function OrbitRing({ radius, color = 'rgba(255,255,255,0.25)', highlight = false }: { radius: number; color?: string; highlight?: boolean }) {
  const lineObj = useMemo(() => {
    const segments = 128;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: highlight ? 0.45 : 0.2,
      linewidth: highlight ? 2 : 1,
    });
    return new THREE.Line(geo, mat);
  }, [radius, color, highlight]);

  return <primitive object={lineObj} />;
}

/* ── Eccentric Comet Orbit ─────────────────────────────────────── */
function CometOrbit() {
  const lineObj = useMemo(() => {
    const segments = 120;
    const pts: THREE.Vector3[] = [];
    // High-eccentricity ellipse
    const a = 110;
    const b = 38;
    for (let i = 0; i <= segments; i++) {
      const th = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(th) * a - 40, Math.sin(th) * 8, Math.sin(th) * b));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.25,
    });
    return new THREE.Line(geo, mat);
  }, []);

  return <primitive object={lineObj} />;
}

/* ── Central Radiant Sun ───────────────────────────────────────── */
function CentralSun() {
  const coronaRef = useRef<THREE.Mesh>(null);
  const dustDiskRef = useRef<THREE.Mesh>(null);
  const [sunMap, setSunMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/sun.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setSunMap(tex);
    });
  }, []);

  useFrame((_, delta) => {
    if (coronaRef.current) {
      coronaRef.current.rotation.y += delta * 0.08;
      const s = 1.0 + Math.sin(Date.now() * 0.002) * 0.05;
      coronaRef.current.scale.set(s, s, s);
    }
    if (dustDiskRef.current) {
      dustDiskRef.current.rotation.z += delta * 0.015;
    }
  });

  return (
    <group>
      {/* 1. Luminous Sun Core */}
      <mesh>
        <sphereGeometry args={[5.2, 32, 32]} />
        <meshBasicMaterial
          map={sunMap || undefined}
          color={sunMap ? '#ffffff' : '#fff4cc'}
        />
      </mesh>

      {/* 2. Solar Corona Halo */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[7.2, 32, 32]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.4}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Outer Golden Solar Flares */}
      <mesh>
        <sphereGeometry args={[11.5, 32, 32]} />
        <meshBasicMaterial
          color="#ea580c"
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Planar Ecliptic Glow Disk (Golden Solar Light Sheet as in image) */}
      <mesh ref={dustDiskRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.0, 24.0, 64]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Central Solar Point Light illuminating the entire Orrery */}
      <pointLight intensity={4.2} distance={300} color="#fffbeb" decay={1.1} />
    </group>
  );
}

/* ── Revolving Planet Body ─────────────────────────────────────── */
function Planet({ def }: { def: PlanetDef }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const moonsRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [ringsTexture, setRingsTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(def.texturePath, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
    });
    if (def.hasRings) {
      loader.load('/textures/saturn-rings.png', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setRingsTexture(tex);
      });
    }
  }, [def.texturePath, def.hasRings]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Orbital revolution
      groupRef.current.rotation.y += delta * def.orbitSpeed;
    }
    if (meshRef.current) {
      // Axial rotation
      meshRef.current.rotation.y += delta * 0.05;
    }
    if (moonsRef.current && def.moons) {
      moonsRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group ref={groupRef} rotation={[0, def.initialAngle, 0]}>
      <group position={[def.orbitRadius, 0, 0]}>
        {/* Planet Sphere */}
        <mesh ref={meshRef} rotation={[def.tilt || 0, 0, 0]}>
          <sphereGeometry args={[def.radius, 32, 32]} />
          <meshStandardMaterial
            map={texture || undefined}
            color={texture ? '#ffffff' : def.color}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        {/* Atmosphere Glow for larger planets */}
        {def.radius > 1.0 && (
          <mesh>
            <sphereGeometry args={[def.radius * 1.04, 32, 32]} />
            <meshBasicMaterial
              color={def.color}
              transparent
              opacity={0.1}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}

        {/* Saturn Planetary Rings */}
        {def.hasRings && def.ringsInner && def.ringsOuter && (
          <mesh rotation={[-Math.PI / 2 + (def.tilt || 0), 0, 0]}>
            <ringGeometry args={[def.ringsInner, def.ringsOuter, 64]} />
            <meshStandardMaterial
              map={ringsTexture || undefined}
              color={ringsTexture ? '#ffffff' : '#fde047'}
              transparent
              opacity={0.88}
              side={THREE.DoubleSide}
              roughness={0.6}
            />
          </mesh>
        )}

        {/* Orbiting Moons */}
        {def.moons && def.moons.length > 0 && (
          <group ref={moonsRef}>
            {def.moons.map((m, idx) => (
              <mesh
                key={idx}
                position={[
                  Math.cos((idx * Math.PI) / 2) * m.dist,
                  ((idx % 2) - 0.5) * 0.3,
                  Math.sin((idx * Math.PI) / 2) * m.dist,
                ]}
              >
                <sphereGeometry args={[m.radius, 12, 12]} />
                <meshStandardMaterial color={m.color} roughness={0.8} />
              </mesh>
            ))}
          </group>
        )}
      </group>
    </group>
  );
}

/* ── Dense Sparkling Golden Asteroid Belt ──────────────────────── */
// Replicates the glittering golden river of asteroids seen in the reference image
function GoldenAsteroidBelt() {
  const pointsRef = useRef<THREE.Points>(null);
  const rocksGroupRef = useRef<THREE.Group>(null);
  const [rockMap, setRockMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/asteroid.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setRockMap(tex);
    });
  }, []);

  // 1. 2,400 glittering golden/amber particles
  const { positions, colors } = useMemo(() => {
    const count = 2400;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#f59e0b'), // Amber gold
      new THREE.Color('#fbbf24'), // Bright gold
      new THREE.Color('#d97706'), // Warm ochre
      new THREE.Color('#fcd34d'), // Pale gold
      new THREE.Color('#b45309'), // Deep bronze
      new THREE.Color('#ffffff'), // Specular glint
    ];

    for (let i = 0; i < count; i++) {
      // Toroidal band between radius 70 and 90
      const r = 70 + Math.pow(Math.random(), 0.8) * 20;
      const theta = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 4.5 * (1 - Math.abs(r - 80) / 10);

      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(theta) * r;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return { positions: pos, colors: col };
  }, []);

  // 2. 70 larger tumbling 3D faceted asteroid rocks
  const rocks = useMemo(() => {
    const list = [];
    const count = 75;
    for (let i = 0; i < count; i++) {
      const r = 72 + Math.random() * 16;
      const th = (i / count) * Math.PI * 2 + Math.random() * 0.1;
      const y = (Math.random() - 0.5) * 3.5;
      list.push({
        pos: [Math.cos(th) * r, y, Math.sin(th) * r] as [number, number, number],
        scale: 0.22 + Math.random() * 0.45,
        rotSpeed: [
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.04,
        ] as [number, number, number],
      });
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.006;
    }
    if (rocksGroupRef.current) {
      rocksGroupRef.current.rotation.y += delta * 0.006;
      rocksGroupRef.current.children.forEach((child, i) => {
        const r = rocks[i];
        if (r) {
          child.rotation.x += r.rotSpeed[0];
          child.rotation.y += r.rotSpeed[1];
          child.rotation.z += r.rotSpeed[2];
        }
      });
    }
  });

  return (
    <group>
      {/* Glittering Golden Particle Swarm */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.6}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 3D Tumbling Asteroids */}
      <group ref={rocksGroupRef}>
        {rocks.map((r, idx) => (
          <mesh key={idx} position={r.pos} scale={r.scale}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              map={rockMap || undefined}
              bumpMap={rockMap || undefined}
              bumpScale={0.08}
              roughness={0.9}
              metalness={0.15}
              color="#eab308"
              flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── The Moon (Orbiting Earth at [0, 0, 0]) ─────────────────────── */
function Moon() {
  const moonRef = useRef<THREE.Mesh>(null);
  const [moonMap, setMoonMap] = useState<THREE.Texture | null>(null);
  const angleRef = useRef(1.1);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/moon.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setMoonMap(tex);
    });
  }, []);

  useFrame((_, delta) => {
    angleRef.current += delta * 0.02;
    const r = 9.2;
    const x = Math.cos(angleRef.current) * r;
    const z = Math.sin(angleRef.current) * r;
    const y = Math.sin(angleRef.current * 0.5) * 1.5;

    if (moonRef.current) {
      moonRef.current.position.set(x, y, z);
      moonRef.current.rotation.y += delta * 0.02;
    }
  });

  const lunarOrbit = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 72;
    for (let i = 0; i <= count; i++) {
      const a = (i / count) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 9.2, Math.sin(a * 0.5) * 1.5, Math.sin(a) * 9.2));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: '#94a3b8',
      transparent: true,
      opacity: 0.15,
    });
    return new THREE.Line(geo, mat);
  }, []);

  return (
    <group>
      <primitive object={lunarOrbit} />
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.46, 32, 32]} />
        <meshStandardMaterial
          map={moonMap || undefined}
          bumpMap={moonMap || undefined}
          bumpScale={0.03}
          roughness={0.92}
          metalness={0.08}
          color={moonMap ? '#ffffff' : '#cbd5e1'}
        />
      </mesh>
    </group>
  );
}

/* ── Deep Space Cosmos & Nebulae ───────────────────────────────── */
function DeepSpaceStars() {
  const starsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const count = 3500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#93c5fd'),
      new THREE.Color('#67e8f9'),
      new THREE.Color('#fef08a'),
      new THREE.Color('#fdba74'),
      new THREE.Color('#f472b6'),
    ];

    for (let i = 0; i < count; i++) {
      const r = 240 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return { positions: pos, colors: col };
  }, []);

  useFrame((_, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.0005;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.4}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

/* ── Complete Solar System Orrery ──────────────────────────────── */
export default function SolarSystemBackground() {
  return (
    <group>
      {/* 1. Deep Space Stellar Cosmos */}
      <DeepSpaceStars />

      {/* 2. Moon orbiting Earth at [0, 0, 0] */}
      <Moon />

      {/* 3. Solar System Centered at SUN_POS */}
      <group position={[SUN_POS.x, SUN_POS.y, SUN_POS.z]} rotation={[0.08, 0, 0.04]}>
        {/* Central Sun */}
        <CentralSun />

        {/* Concentric Planetary Orbit Rings (delicate white/cyan/gold lines as in image) */}
        <OrbitRing radius={14} color="#94a3b8" />
        <OrbitRing radius={25} color="#fef08a" />
        <OrbitRing radius={R_EARTH} color="#00d4ff" highlight /> {/* Earth's Orbit Path passing through Earth! */}
        <OrbitRing radius={56} color="#f87171" />
        <OrbitRing radius={104} color="#fed7aa" />
        <OrbitRing radius={136} color="#fde047" />
        <OrbitRing radius={168} color="#a5f3fc" />
        <OrbitRing radius={198} color="#60a5fa" />
        <OrbitRing radius={228} color="#cbd5e1" />

        {/* Eccentric Crossing Comet Orbit Line */}
        <CometOrbit />

        {/* Revolving Planets */}
        {PLANETS.map((def) => (
          <Planet key={def.name} def={def} />
        ))}

        {/* Dense Golden Asteroid Belt River */}
        <GoldenAsteroidBelt />
      </group>
    </group>
  );
}
