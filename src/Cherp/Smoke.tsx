import { useMemo } from "react";
import * as THREE from "three";

// A single, very faint incense wisp rising from an ember.
//
// Drawn on a camera-facing (Y-axis billboard) plane with a shader: a thin
// filament that meanders as it rises, widens and breaks up with height, then
// dissipates. Driven entirely by `time` so every render is deterministic.

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uSeed;
uniform float uOpacity;
uniform vec3 uColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.07 + 5.3;
    a *= 0.5;
  }
  return s;
}

// One filament. Returns its density at this pixel.
float filament(vec2 uv, float t, float seed, float spread) {
  float y = uv.y;
  float rise = y * 3.2 - t * 0.55;
  // Laminar near the ember, increasingly turbulent as it rises.
  float turb = smoothstep(0.05, 0.75, y);
  float center = 0.5
    + sin(y * 5.5 - t * 0.8 + seed) * 0.035 * (0.3 + turb)
    + sin(y * 11.0 - t * 1.4 + seed * 2.3) * 0.018 * turb
    + (fbm(vec2(seed * 3.0, rise)) - 0.5) * 0.32 * turb * spread;
  float width = mix(0.006, 0.055, pow(y, 1.2));
  float d = (uv.x - center) / width;
  float core = exp(-d * d * 1.6);
  // Break the filament into drifting veils higher up.
  float veil = fbm(vec2(uv.x * 7.0 + seed, y * 6.0 - t * 0.9));
  core *= mix(1.0, smoothstep(0.3, 0.75, veil) * 1.4, turb);
  return core;
}

void main() {
  float t = uTime;
  float y = vUv.y;
  float dens = filament(vUv, t, uSeed, 1.0) + 0.55 * filament(vUv, t + 3.1, uSeed + 7.0, 1.4);
  float fadeIn = smoothstep(0.0, 0.04, y);
  float fadeOut = 1.0 - smoothstep(0.35, 1.0, y);
  float alpha = clamp(dens, 0.0, 1.0) * fadeIn * fadeOut * uOpacity;
  // Thinner, fainter near the top.
  alpha *= mix(1.0, 0.55, y);
  gl_FragColor = vec4(uColor, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const Smoke: React.FC<{
  position: [number, number, number];
  time: number;
  seed: number;
  cameraPosition: THREE.Vector3;
  opacity?: number;
  height?: number;
}> = ({ position, time, seed, cameraPosition, opacity = 0.32, height = 11 }) => {
  const width = height * 0.42;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: seed },
          uOpacity: { value: opacity },
          uColor: { value: new THREE.Color("#e4e0d8") },
        },
      }),
    [seed, opacity],
  );
  material.uniforms.uTime.value = time;

  // Plane anchored at its bottom-centre on the ember.
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, 1, 1);
    g.translate(0, height / 2, 0);
    return g;
  }, [width, height]);

  // Face the camera around the vertical axis only, so the smoke keeps rising
  // straight up while the camera orbits.
  const yaw = Math.atan2(
    cameraPosition.x - position[0],
    cameraPosition.z - position[2],
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      rotation={[0, yaw, 0]}
      renderOrder={10}
      frustumCulled={false}
    />
  );
};
