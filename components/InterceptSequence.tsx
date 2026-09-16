'use client';
import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface Props {
  debrisPos: THREE.Vector3 | null;
  onComplete: () => void;
}

export default function InterceptSequence({ debrisPos, onComplete }: Props) {
  const rocketRef = useRef<THREE.Group>(null);
  const explosionRef = useRef<THREE.Points>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const [phase, setPhase] = useState<'launch' | 'explode' | 'done'>('launch');
  const launchStartTime = useRef(Date.now());
  const explodeStartTime = useRef(0);
  
  const duration = 2500; // 2.5 seconds flight time for dramatic effect
  const startPos = new THREE.Vector3(0, 2.05, 0); // Just above Earth surface

  // Generate explosion particles
  const particlesCount = 200;
  const [initialPos] = useState(() => {
    const pos = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount; i++) {
      // Random directions
      const r = Math.random() * 0.1;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  });

  useFrame(() => {
    if (!debrisPos) return;

    if (phase === 'launch') {
      const t = (Date.now() - launchStartTime.current) / duration;
      if (t >= 1) {
        setPhase('explode');
        explodeStartTime.current = Date.now();
        if (rocketRef.current) rocketRef.current.visible = false;
        return;
      }
      
      if (rocketRef.current) {
        // Accelerate smoothly
        const easeT = t * t * (3 - 2 * t); // Smoothstep easing
        rocketRef.current.position.lerpVectors(startPos, debrisPos, easeT);
        rocketRef.current.lookAt(debrisPos);
        rocketRef.current.rotateX(Math.PI / 2); // Orient cylinder up
      }
    } else if (phase === 'explode') {
      const et = (Date.now() - explodeStartTime.current) / 1500;
      if (et >= 1) {
        setPhase('done');
        onComplete();
        return;
      }
      
      if (explosionRef.current) {
        const material = explosionRef.current.material as THREE.PointsMaterial;
        material.opacity = 1 - et;
        const positionsAttr = explosionRef.current.geometry.attributes.position as THREE.BufferAttribute;
        // Expand particles outward
        for (let i = 0; i < particlesCount; i++) {
          positionsAttr.array[i * 3] += positionsAttr.array[i * 3] * 0.08;
          positionsAttr.array[i * 3 + 1] += positionsAttr.array[i * 3 + 1] * 0.08;
          positionsAttr.array[i * 3 + 2] += positionsAttr.array[i * 3 + 2] * 0.08;
        }
        positionsAttr.needsUpdate = true;
      }
      
      if (flashLightRef.current) {
        flashLightRef.current.intensity = Math.max(0, 5 * (1 - et * 3));
      }
    }
  });

  useEffect(() => {
    // Reset state if debrisPos changes (new intercept)
    if (debrisPos) {
      setPhase('launch');
      launchStartTime.current = Date.now();
    }
  }, [debrisPos]);

  if (phase === 'done' || !debrisPos) return null;

  return (
    <group>
      {/* Rocket */}
      {phase === 'launch' && (
        <group ref={rocketRef}>
          {/* Main body */}
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#00d4ff" emissiveIntensity={2} />
          </mesh>
          {/* Exhaust plume */}
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0, 0.03, 0.04, 8]} />
            <meshBasicMaterial color="#ff8800" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
          </mesh>
          <pointLight color="#ffaa00" intensity={3} distance={1.5} position={[0, -0.05, 0]} />
        </group>
      )}

      {/* Explosion */}
      {phase === 'explode' && (
        <group position={debrisPos}>
          <points ref={explosionRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={particlesCount}
                array={initialPos}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.06}
              color="#ffaa00"
              transparent
              opacity={1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              sizeAttenuation={true}
            />
          </points>
          <pointLight ref={flashLightRef} color="#ffffff" intensity={5} distance={15} />
          <Html center zIndexRange={[100, 0]}>
            {/* Screen Flash Overlay */}
            <div style={{
              background: 'rgba(255,255,255,0.7)',
              width: '100vw',
              height: '100vh',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 9999,
              animation: 'flash-fade 0.5s ease-out forwards'
            }} />
          </Html>
        </group>
      )}
    </group>
  );
}
