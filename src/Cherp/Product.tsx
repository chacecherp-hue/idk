import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { makeConcrete } from "./concrete";
import {
  LEFT,
  LIGHTER,
  MIDDLE,
  MIDDLE_STICKS,
  RIGHT,
  STICK,
  TRAY_STICK,
} from "./dimensions";
import {
  buildLeftBase,
  buildLeftBlock,
  buildMiddleBlock,
  buildTray,
} from "./geometry";

export type Ember = { position: [number, number, number]; seed: number };

// Where each incense stick stands, as [base, tilt about Z].
const stickPlacements = (): {
  base: [number, number, number];
  lean: number;
  length: number;
}[] => [
  ...MIDDLE_STICKS.zs.map((z) => ({
    base: [
      MIDDLE.x + MIDDLE.stickSlot.x - 0.2,
      MIDDLE_STICKS.baseY,
      MIDDLE.stickSlot.z + z,
    ] as [number, number, number],
    lean: MIDDLE_STICKS.lean,
    length: STICK.length,
  })),
  {
    base: [
      RIGHT.x + TRAY_STICK.dx,
      RIGHT.h - RIGHT.cavity.depth,
      TRAY_STICK.z,
    ] as [number, number, number],
    lean: 0,
    length: TRAY_STICK.length,
  },
];

const tipOf = (base: [number, number, number], lean: number, length: number) =>
  [
    base[0] + Math.sin(lean) * length,
    base[1] + Math.cos(lean) * length,
    base[2],
  ] as [number, number, number];

// Ember positions, for the smoke and the tip glow.
export const embers: Ember[] = stickPlacements().map((s, i) => ({
  position: tipOf(s.base, s.lean, s.length + STICK.emberLength),
  seed: i * 2.17 + 0.6,
}));

const Stick: React.FC<{
  base: [number, number, number];
  lean: number;
  length: number;
  coating: THREE.Material;
  ash: THREE.Material;
  glow: THREE.Material;
  geometries: {
    body: THREE.BufferGeometry;
    ash: THREE.BufferGeometry;
    glow: THREE.BufferGeometry;
  };
}> = ({ base, lean, length, coating, ash, glow, geometries }) => (
  <group position={base} rotation={[0, 0, -lean]}>
    <mesh
      geometry={geometries.body}
      material={coating}
      position={[0, length / 2, 0]}
      scale={[1, length / STICK.length, 1]}
      castShadow
      receiveShadow
    />
    {/* Glowing ember band, capped by a sliver of grey ash. */}
    <mesh
      geometry={geometries.glow}
      material={glow}
      position={[0, length + STICK.emberLength * 0.35, 0]}
    />
    <mesh
      geometry={geometries.ash}
      material={ash}
      position={[0, length + STICK.emberLength * 0.85, 0]}
      castShadow
    />
  </group>
);

const Lighter: React.FC = () => {
  const parts = useMemo(() => {
    const body = new THREE.CylinderGeometry(1, 1, LIGHTER.bodyH, 64, 1);
    body.scale(LIGHTER.bodyRx, 1, LIGHTER.bodyRz);
    body.translate(0, -LIGHTER.bodyH / 2, 0);
    const collar = new THREE.CylinderGeometry(1, 1, 0.34, 64, 1);
    collar.scale(LIGHTER.bodyRx * 0.97, 1, LIGHTER.bodyRz * 0.97);
    collar.translate(0, 0.17, 0);
    const hood = new RoundedBoxGeometry(1.2, 1.3, 1.08, 4, 0.12);
    hood.translate(-0.32, 0.34 + 0.65, 0);
    const wheel = new THREE.CylinderGeometry(0.34, 0.34, 0.62, 40);
    wheel.rotateX(Math.PI / 2);
    wheel.translate(0.52, 1.32, 0);
    const lever = new RoundedBoxGeometry(0.92, 0.55, 0.9, 3, 0.1);
    lever.translate(0.58, 0.34 + 0.27, 0);
    return { body, collar, hood, wheel, lever };
  }, []);

  const materials = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({
        color: "#23359a",
        roughness: 0.32,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
      }),
      red: new THREE.MeshPhysicalMaterial({
        color: "#b3121b",
        roughness: 0.38,
        clearcoat: 0.4,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: "#b9babc",
        metalness: 0.55,
        roughness: 0.32,
      }),
      darkMetal: new THREE.MeshStandardMaterial({
        color: "#3a3a3c",
        metalness: 1,
        roughness: 0.45,
      }),
    }),
    [],
  );

  const { lighterHole } = MIDDLE;
  const topY = MIDDLE.h - lighterHole.depth + LIGHTER.bodyH;

  return (
    <group
      position={[MIDDLE.x + lighterHole.x, topY, lighterHole.z]}
      rotation={[0, 0.35, 0]}
    >
      <mesh geometry={parts.body} material={materials.body} castShadow receiveShadow />
      <mesh geometry={parts.collar} material={materials.red} castShadow receiveShadow />
      <mesh geometry={parts.hood} material={materials.metal} castShadow receiveShadow />
      <mesh geometry={parts.wheel} material={materials.darkMetal} castShadow receiveShadow />
      <mesh geometry={parts.lever} material={materials.red} castShadow receiveShadow />
    </group>
  );
};

export const Product: React.FC<{ emberGlow: number }> = ({ emberGlow }) => {
  const geometry = useMemo(
    () => ({
      leftBase: buildLeftBase(),
      leftBlock: buildLeftBlock(),
      middle: buildMiddleBlock(),
      tray: buildTray(),
    }),
    [],
  );

  // Separate castings get their own seed so the texture never repeats.
  const concrete = useMemo(
    () => [
      makeConcrete({ color: "#9d9b97", seed: 1, roughness: 0.8 }),
      makeConcrete({ color: "#a09e99", seed: 2, roughness: 0.78 }),
      makeConcrete({ color: "#9c9a95", seed: 3, roughness: 0.8 }),
      makeConcrete({ color: "#9e9c97", seed: 4, roughness: 0.79 }),
    ],
    [],
  );

  const stickParts = useMemo(
    () => ({
      geometries: {
        body: new THREE.CylinderGeometry(STICK.radius, STICK.radius, STICK.length, 20),
        glow: new THREE.CylinderGeometry(
          STICK.radius * 0.96,
          STICK.radius,
          STICK.emberLength * 0.7,
          20,
        ),
        ash: (() => {
          const g = new THREE.SphereGeometry(STICK.radius * 0.95, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
          g.scale(1, 0.9, 1);
          return g;
        })(),
      },
      coating: makeConcrete({
        color: STICK.color,
        seed: 9,
        scale: 0.18,
        roughness: 0.92,
        voids: 0,
        aggregate: 0.5,
        tonal: 0.6,
      }),
      ash: new THREE.MeshStandardMaterial({ color: "#8f8a84", roughness: 1 }),
      glow: new THREE.MeshStandardMaterial({
        color: "#3a0d04",
        emissive: new THREE.Color("#ff4a12"),
        emissiveIntensity: 0,
        roughness: 1,
      }),
    }),
    [],
  );
  stickParts.glow.emissiveIntensity = 3.2 * emberGlow;

  return (
    <group>
      <group position={[LEFT.x, 0, 0]}>
        <mesh geometry={geometry.leftBase} material={concrete[0]} castShadow receiveShadow />
        <mesh
          geometry={geometry.leftBlock}
          material={concrete[1]}
          position={[0, LEFT.base.h - LEFT.recess.depth, 0]}
          castShadow
          receiveShadow
        />
      </group>
      <mesh
        geometry={geometry.middle}
        material={concrete[2]}
        position={[MIDDLE.x, 0, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={geometry.tray}
        material={concrete[3]}
        position={[RIGHT.x, 0, 0]}
        castShadow
        receiveShadow
      />
      <Lighter />
      {stickPlacements().map((s, i) => (
        <Stick
          key={i}
          base={s.base}
          lean={s.lean}
          length={s.length}
          coating={stickParts.coating}
          ash={stickParts.ash}
          glow={stickParts.glow}
          geometries={stickParts.geometries}
        />
      ))}
    </group>
  );
};
