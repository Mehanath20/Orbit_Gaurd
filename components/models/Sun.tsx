'use client';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const SUN_VERTEX_SHADER = `
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

const SUN_FRAGMENT_SHADER = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// --- Ashima Simplex Noise ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float limb = dot(normalize(vNormal), viewDir);
  float limbDark = pow(max(limb, 0.0), 0.6);

  float gran1 = snoise(vec3(vUv * 6.0,  uTime * 0.04));
  float gran2 = snoise(vec3(vUv * 14.0, uTime * 0.07));
  float gran3 = snoise(vec3(vUv * 28.0, uTime * 0.11));
  float gran4 = snoise(vec3(vUv * 56.0, uTime * 0.15));
  float granulation = gran1*0.45 + gran2*0.28 + gran3*0.17 + gran4*0.10;

  float spot1 = smoothstep(0.08, 0.0, length(vUv - vec2(0.3, 0.55)));
  float spot2 = smoothstep(0.05, 0.0, length(vUv - vec2(0.65, 0.4)));
  float spots = spot1 * 0.6 + spot2 * 0.4;

  vec3 whiteHot   = vec3(1.00, 0.98, 0.92);
  vec3 yellowCore = vec3(1.00, 0.80, 0.20);
  vec3 orangeMid  = vec3(1.00, 0.45, 0.05);
  vec3 deepEdge   = vec3(0.75, 0.15, 0.01);

  vec3 color = mix(deepEdge,   orangeMid,  smoothstep(0.0, 0.4, limbDark));
  color      = mix(color,      yellowCore, smoothstep(0.3, 0.7, limbDark));
  color      = mix(color,      whiteHot,   smoothstep(0.6, 1.0, limbDark));

  color += granulation * 0.07 * vec3(1.0, 0.6, 0.1);
  color -= granulation * 0.03;

  vec3 spotColor = vec3(0.4, 0.1, 0.02);
  color = mix(color, spotColor, spots * limbDark);

  float flare = snoise(vec3(vUv * 3.0, uTime * 0.02 + 5.0));
  flare = max(0.0, flare - 0.6) * 2.5;
  color += flare * vec3(1.0, 0.8, 0.4) * 0.3;

  color *= 1.4;
  color = clamp(color, 0.0, 1.5);

  gl_FragColor = vec4(color, 1.0);
}
`;

const CORONA_VERTEX_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CORONA_FRAGMENT_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;
void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float rim = 1.0 - dot(normalize(vNormal), viewDir);
  rim = pow(rim, 3.5);
  float pulse = 0.85 + 0.15 * sin(uTime * 1.2);
  vec3 coronaColor = vec3(1.0, 0.5, 0.05);
  gl_FragColor = vec4(coronaColor * rim * pulse, rim * 0.7);
}
`;

function Prominences() {
  const curves = useMemo(() => {
    return Array.from({ length: 6 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const r1 = 4.8;
      const r2 = 5.5 + Math.random() * 2.5; // looping out 1.5-3 units from surface (radius 5)
      
      const p1 = new THREE.Vector3(Math.cos(angle)*r1, 0, Math.sin(angle)*r1);
      const p2 = new THREE.Vector3(Math.cos(angle+0.2)*r2, (Math.random()-0.5)*2, Math.sin(angle+0.2)*r2);
      const p3 = new THREE.Vector3(Math.cos(angle+0.4)*r1, 0, Math.sin(angle+0.4)*r1);
      
      return {
        curve: new THREE.CatmullRomCurve3([p1, p2, p3]),
        rotSpeed: (Math.random() - 0.5) * 0.01,
        pulseSpeed: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2
      };
    });
  }, []);

  const groups = useRef<THREE.Group[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    groups.current.forEach((g, i) => {
      if (g && curves[i]) {
        g.rotation.y += curves[i].rotSpeed;
        const scale = 1.0 + 0.2 * Math.sin(t * curves[i].pulseSpeed + curves[i].phase);
        g.scale.set(scale, scale, scale);
      }
    });
  });

  return (
    <group>
      {curves.map((c, i) => (
        <group key={i} ref={(el) => { if (el) groups.current[i] = el; }}>
          <mesh>
            <tubeGeometry args={[c.curve, 30, 0.05, 8, false]} />
            <meshBasicMaterial color="#ff8800" opacity={0.6} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GodRays() {
  const groupRef = useRef<THREE.Group>(null);
  
  const rays = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const length = 20 + Math.random() * 15;
      return { angle, length };
    });
  }, []);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z += 0.0001;
  });

  return (
    <group ref={groupRef}>
      {rays.map((r, i) => (
        <mesh key={i} rotation={[0, 0, r.angle]} position={[Math.cos(r.angle) * r.length/2, Math.sin(r.angle) * r.length/2, 0]}>
          <planeGeometry args={[0.1, r.length]} />
          <meshBasicMaterial color="#ffcc44" opacity={0.04} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export default function Sun() {
  const sunRef = useRef<THREE.Mesh>(null);
  const shaderMat = useRef<THREE.ShaderMaterial>(null);
  const coronaMat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.0003;
    }
  });

  useEffect(() => {
    return () => {
      // Cleanup geometries and materials handled by useMemo if any, though Fiber unmounts them typically.
    };
  }, []);

  return (
    <group>
      {/* Sun Core */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[5, 128, 128]} />
        <shaderMaterial
          ref={shaderMat}
          vertexShader={SUN_VERTEX_SHADER}
          fragmentShader={SUN_FRAGMENT_SHADER}
          uniforms={uniforms}
        />
      </mesh>

      {/* Corona Shell 1 */}
      <mesh>
        <sphereGeometry args={[5.15, 64, 64]} />
        <shaderMaterial
          ref={coronaMat}
          vertexShader={CORONA_VERTEX_SHADER}
          fragmentShader={CORONA_FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Corona Shell 2 */}
      <mesh>
        <sphereGeometry args={[5.5, 64, 64]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.4} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Corona Shell 3 */}
      <mesh>
        <sphereGeometry args={[6.2, 64, 64]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.2} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Corona Shell 4 */}
      <mesh>
        <sphereGeometry args={[8.0, 64, 64]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Prominences */}
      <Prominences />

      {/* God Rays */}
      <GodRays />

      {/* Lens Flares via Sparkles */}
      <Sparkles count={60} scale={15} size={3} speed={0.05} color="#ffcc44" opacity={0.4} />

      {/* Lens Flare Billboard Sprites */}
      <group>
        <mesh position={[10, 0, 15]}>
          <planeGeometry args={[4, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[18, 0, 25]}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.10} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[25, 0, 35]}>
          <planeGeometry args={[6, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Lighting Sources */}
      <pointLight color="#fff5e0" intensity={8} distance={500} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight color="#ffaa44" intensity={2} distance={300} position={[-20, 10, -40]} />
      <ambientLight color="#111122" intensity={0.05} />
    </group>
  );
}
