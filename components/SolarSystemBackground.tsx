'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Asteroid Data Generator ───────────────────────────────────── */
interface AsteroidInstance {
  pos: [number, number, number];
  rotSpeed: [number, number, number];
  scale: number;
  orbitSpeed: number;
  orbitRadius: number;
  orbitAngle: number;
  color: string;
}

/* ── The Sun (with Solar Corona & Radial Rays) ──────────────────── */
function Sun({ position = [75, 32, 65] as [number, number, number] }) {
  const coronaRef = useRef<THREE.Mesh>(null);
  const raysRef = useRef<THREE.Mesh>(null);
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
      coronaRef.current.rotation.z += delta * 0.05;
      const s = 1.0 + Math.sin(Date.now() * 0.002) * 0.04;
      coronaRef.current.scale.set(s, s, s);
    }
    if (raysRef.current) {
      raysRef.current.rotation.z -= delta * 0.02;
    }
  });

  return (
    <group position={position}>
      {/* Sun sphere core */}
      <mesh>
        <sphereGeometry args={[4.8, 32, 32]} />
        <meshBasicMaterial
          map={sunMap || undefined}
          color={sunMap ? '#ffffff' : '#fff4cc'}
        />
      </mesh>

      {/* Inner pulsating corona */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[6.2, 32, 32]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={0.35}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer solar flare / atmosphere halo */}
      <mesh ref={raysRef}>
        <sphereGeometry args={[9.5, 32, 32]} />
        <meshBasicMaterial
          color="#ff5500"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Extreme distant lens glow */}
      <mesh>
        <sphereGeometry args={[16, 24, 24]} />
        <meshBasicMaterial
          color="#ff8800"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Sun Point Light casting realistic warmth */}
      <pointLight intensity={3.5} distance={250} color="#fff6e5" decay={1.2} />
    </group>
  );
}

/* ── The Moon (Orbiting Earth with Crater Texture) ──────────────── */
function Moon() {
  const moonRef = useRef<THREE.Mesh>(null);
  const [moonMap, setMoonMap] = useState<THREE.Texture | null>(null);
  const angleRef = useRef(0.8);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/moon.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setMoonMap(tex);
    });
  }, []);

  useFrame((_, delta) => {
    angleRef.current += delta * 0.015; // Slow, majestic lunar orbit
    const radius = 9.2;
    const x = Math.cos(angleRef.current) * radius;
    const z = Math.sin(angleRef.current) * radius;
    const y = Math.sin(angleRef.current * 0.5) * 1.5; // Slight orbital inclination (5°)

    if (moonRef.current) {
      moonRef.current.position.set(x, y, z);
      moonRef.current.rotation.y += delta * 0.02;
    }
  });

  // Generate lunar orbit ring points
  const orbitPoints = useMemo(() => {
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
      opacity: 0.1,
    });
    return new THREE.Line(geo, mat);
  }, []);

  return (
    <group>
      {/* Orbit ring */}
      <primitive object={orbitPoints} />

      {/* Moon body */}
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

/* ── Mars (The Red Planet) ─────────────────────────────────────── */
function Mars() {
  const marsRef = useRef<THREE.Mesh>(null);
  const [marsMap, setMarsMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/mars.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setMarsMap(tex);
    });
  }, []);

  useFrame((_, delta) => {
    if (marsRef.current) {
      marsRef.current.rotation.y += delta * 0.025;
    }
  });

  return (
    <group position={[-46, 16, -38]}>
      {/* Mars sphere */}
      <mesh ref={marsRef}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshStandardMaterial
          map={marsMap || undefined}
          bumpMap={marsMap || undefined}
          bumpScale={0.04}
          roughness={0.85}
          metalness={0.1}
          color={marsMap ? '#ffffff' : '#c85a32'}
        />
      </mesh>

      {/* Thin Martian atmospheric haze */}
      <mesh>
        <sphereGeometry args={[0.89, 32, 32]} />
        <meshBasicMaterial
          color="#f87171"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* ── Jupiter (Gas Giant with Galilean Moons) ───────────────────── */
function Jupiter() {
  const jupiterRef = useRef<THREE.Mesh>(null);
  const [jupMap, setJupMap] = useState<THREE.Texture | null>(null);
  const moonsRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/jupiter.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setJupMap(tex);
    });
  }, []);

  useFrame((_, delta) => {
    if (jupiterRef.current) {
      jupiterRef.current.rotation.y += delta * 0.04;
    }
    if (moonsRef.current) {
      moonsRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group position={[-78, -26, -65]}>
      {/* Jupiter body */}
      <mesh ref={jupiterRef}>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshStandardMaterial
          map={jupMap || undefined}
          roughness={0.75}
          metalness={0.05}
          color={jupMap ? '#ffffff' : '#d4a373'}
        />
      </mesh>

      {/* Atmospheric rim */}
      <mesh>
        <sphereGeometry args={[3.32, 32, 32]} />
        <meshBasicMaterial
          color="#fed7aa"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4 Galilean Moons (Io, Europa, Ganymede, Callisto) */}
      <group ref={moonsRef}>
        <mesh position={[4.6, 0.2, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        <mesh position={[-5.8, -0.1, 0.5]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#e0f2fe" />
        </mesh>
        <mesh position={[0, 0.4, 7.2]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial color="#d1d5db" />
        </mesh>
        <mesh position={[-2.5, -0.3, -8.6]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color="#9ca3af" />
        </mesh>
      </group>
    </group>
  );
}

/* ── Saturn (with Tilted Planetary Rings) ───────────────────────── */
function Saturn() {
  const saturnRef = useRef<THREE.Mesh>(null);
  const [saturnMap, setSaturnMap] = useState<THREE.Texture | null>(null);
  const [ringsMap, setRingsMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/saturn.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setSaturnMap(tex);
    });
    loader.load('/textures/saturn-rings.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setRingsMap(tex);
    });
  }, []);

  useFrame((_, delta) => {
    if (saturnRef.current) {
      saturnRef.current.rotation.y += delta * 0.035;
    }
  });

  return (
    <group position={[70, -32, -55]} rotation={[0.42, 0.2, -0.15]}>
      {/* Saturn sphere */}
      <mesh ref={saturnRef}>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshStandardMaterial
          map={saturnMap || undefined}
          roughness={0.7}
          metalness={0.08}
          color={saturnMap ? '#ffffff' : '#fef08a'}
        />
      </mesh>

      {/* Saturn iconic rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.7, 5.0, 64]} />
        <meshStandardMaterial
          map={ringsMap || undefined}
          color={ringsMap ? '#ffffff' : '#e2d9b8'}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
}

/* ── 3D Asteroid Belt with Tumbling Rocky Boulders ─────────────── */
function AsteroidBelt() {
  const groupRef = useRef<THREE.Group>(null);
  const [rockMap, setRockMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/asteroid.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setRockMap(tex);
    });
  }, []);

  // Generate 130 deterministic, tumbling asteroids
  const asteroids = useMemo<AsteroidInstance[]>(() => {
    const list: AsteroidInstance[] = [];
    const count = 130;
    for (let i = 0; i < count; i++) {
      const orbitRadius = 42 + (i % 25) * 0.9 + Math.sin(i * 13) * 3.5;
      const orbitAngle = (i / count) * Math.PI * 2;
      const height = Math.sin(i * 37) * 4.5 + ((i % 7) - 3) * 1.2;
      const x = Math.cos(orbitAngle) * orbitRadius;
      const z = Math.sin(orbitAngle) * orbitRadius;

      list.push({
        pos: [x, height, z],
        rotSpeed: [
          (Math.sin(i * 1.7) * 0.02) || 0.01,
          (Math.cos(i * 2.3) * 0.02) || 0.015,
          (Math.sin(i * 3.1) * 0.015) || 0.008,
        ],
        scale: 0.18 + (i % 5) * 0.08 + Math.abs(Math.sin(i * 7)) * 0.18,
        orbitSpeed: 0.0008 + (i % 4) * 0.0003,
        orbitRadius,
        orbitAngle,
        color: ['#64748b', '#78716c', '#475569', '#a8a29e', '#52525b'][i % 5],
      });
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Entire belt slowly orbits
      groupRef.current.rotation.y += delta * 0.004;

      // Individual asteroid tumbling
      groupRef.current.children.forEach((child, i) => {
        const ast = asteroids[i];
        if (ast) {
          child.rotation.x += ast.rotSpeed[0];
          child.rotation.y += ast.rotSpeed[1];
          child.rotation.z += ast.rotSpeed[2];
        }
      });
    }
  });

  return (
    <group ref={groupRef} rotation={[0.08, 0, 0.05]}>
      {asteroids.map((ast, idx) => (
        <mesh key={idx} position={ast.pos} scale={ast.scale}>
          {/* Rough faceted irregular rock geometry */}
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            map={rockMap || undefined}
            bumpMap={rockMap || undefined}
            bumpScale={0.06}
            roughness={0.88}
            metalness={0.18}
            color={rockMap ? '#cccccc' : ast.color}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Deep Space Cosmic Star Dust & Multi-color Stars ───────────── */
function CosmicStarfield() {
  const starsRef = useRef<THREE.Points>(null);

  // Generate 3000 high-density colorful stars
  const { positions, colors } = useMemo(() => {
    const count = 3000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const colorPalette = [
      new THREE.Color('#ffffff'), // White
      new THREE.Color('#93c5fd'), // Blue-white
      new THREE.Color('#67e8f9'), // Cyan
      new THREE.Color('#fef08a'), // Warm yellow
      new THREE.Color('#fdba74'), // Orange star
      new THREE.Color('#f472b6'), // Nebula pink
    ];

    for (let i = 0; i < count; i++) {
      // Spherical shell distribution far away
      const r = 160 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return { positions: pos, colors: col };
  }, []);

  useFrame((_, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.001;
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
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}

/* ── Deep Space Nebula Gas Clouds ──────────────────────────────── */
function CosmicNebulae() {
  return (
    <group>
      {/* Cyan/Teal Cosmic Dust Cloud */}
      <mesh position={[-60, 30, -90]}>
        <sphereGeometry args={[28, 16, 16]} />
        <meshBasicMaterial
          color="#0ea5e9"
          transparent
          opacity={0.035}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Purple/Violet Deep Space Gas */}
      <mesh position={[70, -25, -95]}>
        <sphereGeometry args={[35, 16, 16]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Magenta Stellar Nursery */}
      <mesh position={[20, 55, -110]}>
        <sphereGeometry args={[30, 16, 16]} />
        <meshBasicMaterial
          color="#ec4899"
          transparent
          opacity={0.025}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ── Complete Solar System Assembly ────────────────────────────── */
export default function SolarSystemBackground() {
  return (
    <group>
      {/* 1. Multi-tier cosmic starfield & colorful stellar dust */}
      <CosmicStarfield />

      {/* 2. Deep space glowing nebulae */}
      <CosmicNebulae />

      {/* 3. The Sun (Illumination source & corona) */}
      <Sun position={[75, 32, 65]} />

      {/* 4. The Moon (Orbiting Earth with crater relief) */}
      <Moon />

      {/* 5. Mars (The Red Planet) */}
      <Mars />

      {/* 6. Jupiter with Galilean Moons */}
      <Jupiter />

      {/* 7. Saturn with Tilted Planetary Rings */}
      <Saturn />

      {/* 8. Asteroid Belt (130 Tumbling Rocky Boulders) */}
      <AsteroidBelt />
    </group>
  );
}
