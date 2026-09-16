'use client';
import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const EARTH_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const EARTH_FRAGMENT_SHADER = `
uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform vec3 uSunDirection;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  float sunDot = dot(normalize(vNormal), normalize(uSunDirection));
  float dayMix = smoothstep(-0.15, 0.15, sunDot);
  
  vec4 dayColor   = texture2D(uDayTexture, vUv);
  vec4 nightColor = texture2D(uNightTexture, vUv);
  
  vec4 nightLit = nightColor * 2.5;
  vec4 earthColor = mix(nightLit, dayColor, dayMix);
  
  float oceanMask = smoothstep(0.3, 0.7, dayColor.b - max(dayColor.r, dayColor.g) * 0.5);
  float specular = pow(max(sunDot, 0.0), 40.0) * oceanMask * 0.6;
  earthColor.rgb += vec3(0.8, 0.9, 1.0) * specular * dayMix;
  
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = 1.0 - max(dot(normalize(vNormal), viewDir), 0.0);
  fresnel = pow(fresnel, 3.0);
  
  vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
  earthColor.rgb = mix(earthColor.rgb, atmosphereColor, fresnel * 0.25 * max(sunDot + 0.3, 0.0));
  
  gl_FragColor = earthColor;
}
`;

const CLOUDS_FRAGMENT_SHADER = `
uniform sampler2D uCloudsTexture;
uniform float uTime;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec2 scrolledUv = vUv + vec2(uTime * 0.002, 0.0);
  vec4 clouds = texture2D(uCloudsTexture, scrolledUv);
  
  float sunDot = dot(normalize(vNormal), normalize(uSunDirection));
  float dayMix = smoothstep(-0.1, 0.2, sunDot);
  
  vec3 cloudColor = mix(vec3(0.05, 0.05, 0.08), vec3(1.0), dayMix);
  float cloudShadow = clouds.r * 0.15 * dayMix;
  
  float terminator = smoothstep(-0.05, 0.05, sunDot);
  float edgeGlow = (1.0 - abs(sunDot)) * clouds.r * 0.4 * terminator;
  cloudColor += vec3(0.9, 0.85, 0.7) * edgeGlow;
  
  gl_FragColor = vec4(cloudColor, clouds.r * 0.85);
}
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;
uniform vec3 uSunDirection;

void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float rim = 1.0 - dot(normalize(vNormal), viewDir);
  rim = pow(rim, 2.5);
  
  float sunFacing = dot(normalize(vNormal), normalize(uSunDirection));
  float dayFactor = smoothstep(-0.3, 0.5, sunFacing);
  
  vec3 dayAtmo   = vec3(0.25, 0.55, 1.0);
  vec3 nightAtmo = vec3(0.02, 0.04, 0.12);
  vec3 atmoColor = mix(nightAtmo, dayAtmo, dayFactor);
  
  float terminator = 1.0 - abs(sunFacing);
  terminator = pow(terminator, 4.0) * smoothstep(-0.2, 0.2, sunFacing);
  atmoColor = mix(atmoColor, vec3(1.0, 0.4, 0.1), terminator * 0.5);
  
  gl_FragColor = vec4(atmoColor, rim * 0.6);
}
`;

const OUTER_ATMOSPHERE_FRAGMENT_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float rim = 1.0 - dot(normalize(vNormal), viewDir);
  rim = pow(rim, 4.0);
  gl_FragColor = vec4(0.1, 0.42, 1.0, rim * 0.25);
}
`;

const SUN_POS = new THREE.Vector3(-45, 5, -80);

function EarthModel({ segments }: { segments: number }) {
  const [dayTexture, nightTexture, cloudsTexture] = useTexture([
    '/textures/earth-blue-marble.jpg',
    '/textures/earth-night.jpg',
    '/textures/earth-clouds.png'
  ]);

  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const shadowConeRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(() => ({
    uDayTexture: { value: dayTexture },
    uNightTexture: { value: nightTexture },
    uCloudsTexture: { value: cloudsTexture },
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
    uTime: { value: 0 }
  }), [dayTexture, nightTexture, cloudsTexture]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    if (groupRef.current) {
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);
      uniforms.uSunDirection.value.copy(SUN_POS).sub(worldPos).normalize();
      
      // Update shadow cone rotation to point away from sun
      if (shadowConeRef.current) {
        shadowConeRef.current.position.copy(worldPos).add(uniforms.uSunDirection.value.clone().negate().multiplyScalar(10));
        shadowConeRef.current.lookAt(worldPos);
      }
    }

    if (earthRef.current) earthRef.current.rotation.y += 0.0005;
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.00065;
  });

  return (
    <group ref={groupRef}>
      {/* 1. Earth Surface */}
      <mesh ref={earthRef} receiveShadow>
        <sphereGeometry args={[2, segments, segments]} />
        <shaderMaterial
          vertexShader={EARTH_VERTEX_SHADER}
          fragmentShader={EARTH_FRAGMENT_SHADER}
          uniforms={uniforms}
        />
      </mesh>

      {/* 2. Clouds Layer */}
      <mesh ref={cloudsRef} receiveShadow>
        <sphereGeometry args={[2.02, segments, segments]} />
        <shaderMaterial
          vertexShader={EARTH_VERTEX_SHADER} // safe to reuse
          fragmentShader={CLOUDS_FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* 3. Inner Atmosphere Glow */}
      <mesh>
        <sphereGeometry args={[2.05, segments / 2, segments / 2]} />
        <shaderMaterial
          vertexShader={EARTH_VERTEX_SHADER}
          fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3b. Outer Atmosphere Halo */}
      <mesh>
        <sphereGeometry args={[2.15, segments / 2, segments / 2]} />
        <shaderMaterial
          vertexShader={EARTH_VERTEX_SHADER}
          fragmentShader={OUTER_ATMOSPHERE_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Aurora Borealis */}
      <Sparkles position={[0, 2.1, 0]} count={200} scale={[1.5, 0.3, 1.5]} size={1.5} speed={0.3} color="#00ff88" opacity={0.15} />
      <Sparkles position={[0, -2.1, 0]} count={200} scale={[1.5, 0.3, 1.5]} size={1.5} speed={0.3} color="#88ff00" opacity={0.15} />

      {/* 5. Earth Shadow (Umbra) */}
      <mesh ref={shadowConeRef}>
        <coneGeometry args={[2, 20, 32, 1, true]} />
        <meshBasicMaterial color="#000000" opacity={0.6} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function Earth() {
  const isMobile = typeof navigator !== 'undefined' && navigator.hardwareConcurrency < 4;
  const segments = isMobile ? 64 : 128;

  return (
    <Suspense fallback={
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#1a3a5c" wireframe />
      </mesh>
    }>
      <EarthModel segments={segments} />
    </Suspense>
  );
}
