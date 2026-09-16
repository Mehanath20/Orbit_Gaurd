'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface SatelliteProps {
  position?: THREE.Vector3;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export default function Satellite({ 
  position = new THREE.Vector3(0, 2.5, 0),
  isSelected = false, 
  isHovered = false,
  onClick,
  onPointerOver,
  onPointerOut
}: SatelliteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftPanelRef = useRef<THREE.Mesh>(null);
  const rightPanelRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Generate Solar Panel Texture
  const solarTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a1550';
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 2;
      // 4x8 grid
      const cols = 8;
      const rows = 4;
      for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * (256 / cols), 0);
        ctx.lineTo(i * (256 / cols), 128);
        ctx.stroke();
      }
      for (let j = 0; j <= rows; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * (128 / rows));
        ctx.lineTo(256, j * (128 / rows));
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Scale interpolation
    const targetScale = isSelected ? 2.0 : isHovered ? 1.8 : 1.0;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

    // Position update
    groupRef.current.position.copy(position);

    // Nadir-pointing
    groupRef.current.lookAt(0, 0, 0);

    // Subtle wobble
    groupRef.current.rotateZ(Math.sin(state.clock.elapsedTime * 0.5) * 0.002);

    // Glow oscillation
    if (lightRef.current) {
      const baseIntensity = isSelected ? 2.0 : 0.8;
      lightRef.current.intensity = baseIntensity + Math.sin(state.clock.elapsedTime * (Math.PI * 2 / 3)) * 0.2;
    }

    // Solar panel glint
    const glint = 0.1 + (Math.sin(state.clock.elapsedTime * (Math.PI * 2 / 4) + Math.PI) + 1) / 2 * 0.3;
    if (leftPanelRef.current && leftPanelRef.current.material instanceof THREE.MeshStandardMaterial) {
      leftPanelRef.current.material.emissiveIntensity = glint;
    }
    if (rightPanelRef.current && rightPanelRef.current.material instanceof THREE.MeshStandardMaterial) {
      rightPanelRef.current.material.emissiveIntensity = glint;
    }
  });

  return (
    <group 
      ref={groupRef} 
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(); }}
      onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.(); }}
    >
      <pointLight ref={lightRef} color="#00d4ff" distance={1.5} intensity={0.8} />

      {/* Main Body */}
      <mesh>
        <boxGeometry args={[0.08, 0.06, 0.06]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Panel Lines */}
      {[ -0.015, 0, 0.015 ].map((y, i) => (
        <mesh key={i} position={[0, y, 0.0305]}>
          <boxGeometry args={[0.07, 0.001, 0.001]} />
          <meshBasicMaterial color="#999999" />
        </mesh>
      ))}

      {/* Left Solar Panel */}
      <group position={[-0.13, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, 0.08]} />
          <meshStandardMaterial color="#aaaaaa" />
        </mesh>
        <mesh ref={leftPanelRef}>
          <boxGeometry args={[0.18, 0.001, 0.07]} />
          <meshStandardMaterial 
            color="#1a237e" 
            metalness={0.3} 
            roughness={0.4} 
            emissive="#0d47a1"
            map={solarTexture || undefined}
          />
        </mesh>
      </group>

      {/* Right Solar Panel */}
      <group position={[0.13, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, 0.08]} />
          <meshStandardMaterial color="#aaaaaa" />
        </mesh>
        <mesh ref={rightPanelRef}>
          <boxGeometry args={[0.18, 0.001, 0.07]} />
          <meshStandardMaterial 
            color="#1a237e" 
            metalness={0.3} 
            roughness={0.4} 
            emissive="#0d47a1"
            map={solarTexture || undefined}
          />
        </mesh>
      </group>

      {/* Communication Dish */}
      <group position={[0, 0.035, 0]} rotation={[-0.4, 0, 0]}>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.025, 0.005, 0.001, 16]} />
          <meshStandardMaterial color="#dddddd" metalness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.003, 0.003, 0.025]} />
          <meshStandardMaterial color="#aaaaaa" />
        </mesh>
      </group>

      {/* Antenna Array */}
      <group position={[0.02, 0, -0.03]}>
        <mesh rotation={[Math.PI / 2, 0.2, 0]} position={[0, 0, -0.025]}>
          <cylinderGeometry args={[0.002, 0.002, 0.05]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
        <mesh rotation={[Math.PI / 2, -0.2, 0]} position={[-0.01, 0, -0.025]}>
          <cylinderGeometry args={[0.002, 0.002, 0.05]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0.01, 0.01, -0.025]}>
          <cylinderGeometry args={[0.002, 0.002, 0.05]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
      </group>

      {/* Thruster Nozzles */}
      <group position={[0, 0, 0.03]}>
        {[
          [-0.025, -0.015],
          [0.025, -0.015],
          [-0.025, 0.015],
          [0.025, 0.015]
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.003, 0.01]} />
            <meshStandardMaterial color="#444444" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Tooltip */}
      {isHovered && (
        <Html center position={[0, 0.15, 0]} zIndexRange={[100, 0]}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #00d4ff',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'white',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,212,255,0.2)',
          }}>
            <div style={{ fontWeight: 'bold', color: '#00d4ff', marginBottom: 2 }}>🛰 ISRO-SAT1</div>
            <div style={{ color: 'rgba(255,255,255,0.7)' }}>408 km · 7.66km/s</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4, fontSize: 8 }}>Click to inspect</div>
          </div>
        </Html>
      )}
    </group>
  );
}
