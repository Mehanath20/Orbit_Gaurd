'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MOON_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const MOON_FRAGMENT_SHADER = `
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;

// Procedural crater noise
float crater(vec2 uv, vec2 center, float radius) {
  float d = length(uv - center);
  float rim = smoothstep(radius, radius*0.7, d) * smoothstep(radius*0.5, radius*0.7, d);
  float floor = smoothstep(radius*0.5, 0.0, d) * 0.3;
  return rim - floor;
}

void main() {
  // Base grey surface
  float baseGrey = 0.35 + 0.1 * sin(vUv.x * 40.0) * sin(vUv.y * 40.0);
  
  // Crater map — hardcoded major craters
  float craters = 0.0;
  craters += crater(vUv, vec2(0.3,  0.5),  0.06);
  craters += crater(vUv, vec2(0.65, 0.3),  0.04);
  craters += crater(vUv, vec2(0.5,  0.7),  0.08);
  craters += crater(vUv, vec2(0.2,  0.25), 0.03);
  craters += crater(vUv, vec2(0.75, 0.65), 0.05);
  craters += crater(vUv, vec2(0.45, 0.4),  0.025);
  
  vec3 moonColor = vec3(baseGrey + craters * 0.15);
  
  // Mare (dark flat regions) — simulate with noise
  float mare = smoothstep(0.55, 0.45, sin(vUv.x * 3.0) * sin(vUv.y * 2.5));
  moonColor = mix(moonColor, vec3(0.18, 0.18, 0.2), mare * 0.5);
  
  // Sunlit vs shadow
  float sunDot = dot(normalize(vNormal), normalize(uSunDirection));
  float light = smoothstep(-0.05, 0.15, sunDot);
  moonColor *= mix(0.05, 1.0, light);
  
  // Slight warm tint from Earthshine on dark side
  vec3 earthshine = vec3(0.1, 0.15, 0.25) * (1.0 - light) * 0.3;
  moonColor += earthshine;
  
  gl_FragColor = vec4(moonColor, 1.0);
}
`;

const SUN_POS = new THREE.Vector3(-45, 5, -80);

export default function Moon() {
  const moonRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const uniforms = useMemo(() => ({
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) }
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    
    // Moon orbit: radius 7, full orbit every 40 seconds
    const orbitSpeed = (Math.PI * 2) / 40;
    const angle = t * orbitSpeed;
    
    if (groupRef.current) {
      // Inclination 5.1° (approx 0.089 rad)
      const inc = 0.089;
      groupRef.current.position.set(
        Math.cos(angle) * 7 * Math.cos(inc),
        Math.sin(angle) * 7 * Math.sin(inc),
        Math.sin(angle) * 7 * Math.cos(inc)
      );

      // Tidally locked rotation (rotates on Y axis at same rate as orbit)
      if (moonRef.current) {
        moonRef.current.rotation.y = -angle; // keep same face toward origin (Earth)
      }

      // Update sun direction relative to the Moon's world position
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);
      uniforms.uSunDirection.value.copy(SUN_POS).sub(worldPos).normalize();
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={moonRef} castShadow receiveShadow>
        <sphereGeometry args={[0.54, 64, 64]} />
        <shaderMaterial
          vertexShader={MOON_VERTEX_SHADER}
          fragmentShader={MOON_FRAGMENT_SHADER}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}
