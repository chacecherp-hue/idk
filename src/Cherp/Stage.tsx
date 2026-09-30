import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { makeConcrete } from "./concrete";

// The set: a charcoal cast plinth in a charcoal concrete room, facing a warm
// off-white concrete wall, lit like architectural photography — one hard,
// warm raking key, a cool rim from behind, a soft wash on the back wall.

const PLINTH = { w: 54, h: 6, d: 24 };
const WALL_Z = -32;

export const Stage: React.FC<{ light: number }> = ({ light }) => {
  const { gl, scene } = useThree();

  // A neutral studio environment, only for soft reflections on the satin
  // concrete and the lighter's metal parts.
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.1;
    scene.background = new THREE.Color("#0c0c0c");
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const materials = useMemo(
    () => ({
      plinth: makeConcrete({ color: "#2e2e2d", seed: 21, scale: 1.4, roughness: 0.95, envMapIntensity: 0.15, sheen: 0 }),
      room: makeConcrete({ color: "#1c1c1b", seed: 31, scale: 3, roughness: 0.95, tonal: 1.4, envMapIntensity: 0.15, sheen: 0 }),
      wall: makeConcrete({ color: "#a19e98", seed: 41, scale: 2.4, roughness: 0.95, envMapIntensity: 0.2, sheen: 0, tonal: 1.3, voids: 0.35 }),
    }),
    [],
  );

  const plinthGeometry = useMemo(() => {
    const g = new THREE.BoxGeometry(PLINTH.w, PLINTH.h, PLINTH.d);
    g.translate(0, -PLINTH.h / 2, 0);
    return g;
  }, []);

  const keyTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 3, 0);
    return o;
  }, []);
  const wallTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 8, WALL_Z);
    return o;
  }, []);

  return (
    <>
      <primitive object={keyTarget} />
      <primitive object={wallTarget} />

      {/* Key: warm, hard, from high front-left, raking across the faces. */}
      <directionalLight
        position={[-30, 27, 22]}
        target={keyTarget}
        color="#ffeedd"
        intensity={4 * light}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-radius={3}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
      {/* Rim: cool, from behind right, to separate edges from the wall. */}
      <directionalLight
        position={[24, 16, -26]}
        target={keyTarget}
        color="#dfe7f2"
        intensity={0.7 * light}
      />
      {/* Soft wash on the back wall, falling off toward the floor and edges. */}
      <spotLight
        position={[4, 42, 4]}
        target={wallTarget}
        color="#fff0de"
        intensity={850 * light}
        angle={0.42}
        penumbra={1}
        decay={2}
      />
      <hemisphereLight args={["#cfc7bb", "#141312", 0.1 * light]} />

      <mesh geometry={plinthGeometry} material={materials.plinth} receiveShadow castShadow />
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -PLINTH.h, 0]}
        material={materials.room}
        receiveShadow
      >
        <planeGeometry args={[400, 400]} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 30, WALL_Z]} material={materials.wall} receiveShadow>
        <planeGeometry args={[240, 80]} />
      </mesh>
      {/* Side walls */}
      <mesh
        position={[-90, 30, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={materials.room}
        receiveShadow
      >
        <planeGeometry args={[240, 80]} />
      </mesh>
      <mesh
        position={[90, 30, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        material={materials.room}
        receiveShadow
      >
        <planeGeometry args={[240, 80]} />
      </mesh>
    </>
  );
};
