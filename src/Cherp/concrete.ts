import * as THREE from "three";

// Procedural cast-concrete material.
//
// The texture is a solid (3D) texture evaluated in world space, so it has no UV
// seams on the rounded edges, pocket walls or CSG cuts, and it holds detail in
// the macro shot. It layers:
//   - broad tonal drift and cloudy casting mottle
//   - fine sand grain
//   - small exposed aggregate specks (light and dark minerals)
//   - sparse pinholes (air voids), slightly sunk and darker
// The same height field drives a bump-mapped normal so the grain catches the
// raking key light, and it modulates a matte/satin roughness.

const NOISE_GLSL = /* glsl */ `
vec3 cMod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 cMod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 cPermute(vec4 x) { return cMod289(((x * 34.0) + 10.0) * x); }
vec4 cTaylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

// Ashima / Gustavson 3D simplex noise, range about [-1, 1].
float cSnoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
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
  i = cMod289(i);
  vec4 p = cPermute(cPermute(cPermute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = cTaylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float cFbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * cSnoise(p);
    p = p * 2.03 + vec3(17.1, 9.2, 3.7);
    a *= 0.5;
  }
  return s;
}

vec3 cHash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}

// Cellular noise: x = distance to nearest feature point, yzw = its cell hash.
vec4 cCells(vec3 p) {
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float best = 8.0;
  vec3 bestId = vec3(0.0);
  for (int k = -1; k <= 1; k++)
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec3 o = vec3(float(i), float(j), float(k));
    vec3 h = cHash3(ip + o);
    vec3 r = o + h - fp;
    float d = dot(r, r);
    if (d < best) { best = d; bestId = h; }
  }
  return vec4(sqrt(best), bestId);
}
`;

export type ConcreteOptions = {
  color: string;
  // Scales environment reflections (lower for large, flat, matte surfaces).
  envMapIntensity?: number;
  // Satin sheen of a sealed finish (0 for raw, unsealed surfaces).
  sheen?: number;
  // Offsets the solid texture so separate castings don't share a pattern.
  seed: number;
  // Scales the size of all features (1 = product scale, larger = coarser).
  scale?: number;
  roughness?: number;
  // Strength of pinholes / aggregate (0..1).
  voids?: number;
  aggregate?: number;
  bump?: number;
  // Strength of the broad tonal variation.
  tonal?: number;
};

export const makeConcrete = ({
  color,
  seed,
  scale = 1,
  roughness = 0.8,
  voids = 1,
  aggregate = 1,
  bump = 1,
  tonal = 1,
  envMapIntensity = 1,
  sheen = 0.15,
}: ConcreteOptions) => {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness: 0,
    envMapIntensity,
    // A faint sheen reads as sealed, satin-finished precast.
    sheen,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color("#d9d2c7"),
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSeed = { value: seed };
    shader.uniforms.uScale = { value: scale };
    shader.uniforms.uVoids = { value: voids };
    shader.uniforms.uAggregate = { value: aggregate };
    shader.uniforms.uBump = { value: bump };
    shader.uniforms.uTonal = { value: tonal };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vConcretePos;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvConcretePos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vConcretePos;
uniform float uSeed;
uniform float uScale;
uniform float uVoids;
uniform float uAggregate;
uniform float uBump;
uniform float uTonal;
float concreteHeight;
float concreteRoughShift;
${NOISE_GLSL}

// Mikkelsen bump mapping with unnormalised screen derivatives, so the height
// field is in world units and the grain strength does not change with distance.
vec3 concretePerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = dFdx(surfPos);
  vec3 sy = dFdy(surfPos);
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
  vec3 p = vConcretePos / uScale + vec3(uSeed * 13.7, uSeed * 7.3, uSeed * 3.1);

  // Broad tonal drift across a casting, and cloudy mottle from the mould.
  float broad = cFbm(p * 0.09);
  float mottle = cFbm(p * 0.55 + 4.0);
  float warm = cSnoise(p * 0.21 + 11.0);

  // Fine sand grain.
  float grain = cSnoise(p * 34.0) * 0.55 + cSnoise(p * 83.0) * 0.45;

  // Exposed aggregate: small, sparse mineral specks.
  vec4 agg = cCells(p * 3.1);
  float aggMask = (1.0 - smoothstep(0.1, 0.17, agg.x)) * step(0.55, agg.y) * uAggregate;
  float aggTone = agg.z > 0.5 ? 0.09 : -0.08;

  // Pinholes: very sparse, tiny air voids from casting.
  vec4 pin = cCells(p * 1.25 + 31.0);
  float pinMask = (1.0 - smoothstep(0.018, 0.042, pin.x)) * step(0.8, pin.y) * uVoids;

  vec3 c = diffuseColor.rgb;
  c *= 1.0 + broad * 0.2 * uTonal + mottle * 0.13 * uTonal;
  c *= 1.0 + grain * 0.03;
  c = mix(c, c * vec3(1.03, 1.0, 0.95), clamp(warm * 0.5 + 0.5, 0.0, 1.0) * 0.6);
  c *= 1.0 + aggTone * aggMask;
  c *= 1.0 - 0.3 * pinMask;
  diffuseColor.rgb = c;

  concreteHeight = (grain * 0.0011 + mottle * 0.0015 + aggMask * 0.002 - pinMask * 0.03) * uBump * uScale;
  concreteRoughShift = mottle * 0.08 + grain * 0.03 - aggMask * 0.1 + pinMask * 0.15;
}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + concreteRoughShift, 0.3, 1.0);",
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
{
  vec2 dHdxy = vec2(dFdx(concreteHeight), dFdy(concreteHeight));
  normal = concretePerturb(-vViewPosition, normal, dHdxy, faceDirection);
}`,
      );
  };

  // Each option set compiles to its own program.
  material.customProgramCacheKey = () => "cherp-concrete";
  return material;
};
