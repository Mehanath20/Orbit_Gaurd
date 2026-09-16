'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface Props {
  type: string;
  riskLevel: string;
  distanceKm?: number;
  name: string;
  isSelected?: boolean;
  isHovered?: boolean;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ff2d55',
  HIGH: '#ff6b00',
  MODERATE: '#ffd60a',
  LOW: '#30d158',
};

export default function DebrisObject({ type, riskLevel, distanceKm, name, isSelected, isHovered }: Props) {
  const meshRef = useRef<THREE.Group>(null);
  const color = RISK_COLORS[riskLevel] || '#ffffff';
  
  const rotationSpeeds = useMemo(() => ({
    x: (Math.random() - 0.5) * 0.01,
    y: (Math.random() - 0.5) * 0.01,
    z: (Math.random() - 0.5) * 0.01,
  }), []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeeds.x;
      meshRef.current.rotation.y += rotationSpeeds.y;
      meshRef.current.rotation.z += rotationSpeeds.z;
    }
  });

  const isKiller = name === 'APOPHIS-99' || name === 'KILLER-DEBRIS';
  const scale = isKiller ? 3.5 : (isHovered || isSelected ? 1.5 : 1.0);

  return (
    <group scale={scale}>
      {isKiller ? (
        <pointLight color="#ff0000" distance={5} intensity={8} />
      ) : (
        <pointLight color={color} distance={0.8} intensity={0.2} />
      )}
      
      <group ref={meshRef}>
        {isKiller ? (
          <mesh>
            <dodecahedronGeometry args={[0.03, 1]} />
            <meshStandardMaterial color="#ff2d55" emissive="#ff0000" emissiveIntensity={2.5} roughness={0.2} metalness={0.8} />
          </mesh>
        ) : (
          <>
            {type === 'Rocket Body' && (
              <mesh>
                <cylinderGeometry args={[0.02, 0.025, 0.1, 8]} />
                <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.5} />
              </mesh>
            )}
            
            {type === 'Dead Satellite' && (
              <group>
                <mesh>
                  <boxGeometry args={[0.05, 0.04, 0.04]} />
                  <meshStandardMaterial color="#444444" roughness={0.8} />
                </mesh>
                {/* Broken solar panel */}
                <mesh position={[0.04, 0, 0]} rotation={[0, 0, 0.3]}>
                  <boxGeometry args={[0.06, 0.001, 0.03]} />
                  <meshStandardMaterial color="#1a237e" roughness={0.6} />
                </mesh>
              </group>
            )}
            
            {type === 'Fragment' && (
              <mesh>
                <icosahedronGeometry args={[0.02, 0]} />
                <meshStandardMaterial color="#666666" roughness={0.9} metalness={0.3} />
              </mesh>
            )}
            
            {(type === 'Unknown' || !['Rocket Body', 'Dead Satellite', 'Fragment'].includes(type)) && (
              <mesh>
                <sphereGeometry args={[0.02, 6, 6]} />
                <meshStandardMaterial color="#555555" />
              </mesh>
            )}
          </>
        )}
      </group>

      {/* Hover or Killer Tooltip */}
      {(isHovered || isKiller) && (
        <Html center position={[0, 0.12, 0]} zIndexRange={[100, 0]}>
          <div style={{
            background: isKiller ? 'rgba(255, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isKiller ? '#ff2d55' : color}`,
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'white',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: isKiller ? '12px' : '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: `0 4px 12px ${isKiller ? '#ff2d55aa' : color + '33'}`,
            animation: isKiller ? 'pulse-glow-critical 1s ease-in-out infinite' : 'fade-in 150ms ease-out forwards',
          }}>
            <div style={{ fontWeight: 'bold', color: isKiller ? '#fff' : color, marginBottom: 2 }}>
              {isKiller ? '⚠ ' : '☄ '}{name}
            </div>
            {isKiller && (
              <div style={{ fontWeight: 800, color: '#ffcc00', marginBottom: 4, letterSpacing: '0.05em' }}>
                IMPACT TRAJECTORY DETECTED
              </div>
            )}
            <div>● {riskLevel}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)' }}>{distanceKm?.toFixed(2)} km away</div>
            {!isKiller && <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4, fontSize: 8 }}>Click to inspect</div>}
          </div>
        </Html>
      )}
    </group>
  );
}
