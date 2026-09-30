import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { blackAt, cameraAt, FPS, SHOTS } from "./camera";
import { PostFX } from "./PostFX";
import { embers, Product } from "./Product";
import { Smoke } from "./Smoke";
import { Stage } from "./Stage";

const CameraRig: React.FC<{ frame: number }> = ({ frame }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    const c = cameraAt(frame);
    camera.position.copy(c.position);
    camera.fov = c.fov;
    camera.near = 0.5;
    camera.far = 400;
    camera.up.set(0, 1, 0);
    camera.lookAt(c.target);
    camera.updateProjectionMatrix();
  }, [camera, frame]);
  return null;
};

const Scene: React.FC<{ frame: number }> = ({ frame }) => {
  const cam = cameraAt(frame);
  // The light comes up during the low-angle reveal.
  const light = interpolate(frame, [0, 70], [0.15, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const time = frame / FPS + 20;

  return (
    <>
      <CameraRig frame={frame} />
      <Stage light={light} />
      <Product emberGlow={0.85 + 0.15 * Math.sin(time * 2.1)} />
      {embers.map((e) => (
        <Smoke
          key={e.seed}
          position={e.position}
          seed={e.seed}
          time={time}
          cameraPosition={cam.position}
        />
      ))}
      <PostFX
        focusTarget={cam.target}
        focusRange={cam.bokeh > 0 ? 1.6 : 400}
        bokeh={cam.bokeh}
      />
    </>
  );
};

const Title: React.FC<{ frame: number }> = ({ frame }) => {
  const start = SHOTS.hero.from + 38;
  const title = interpolate(frame, [start, start + 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sub = interpolate(frame, [start + 14, start + 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 92,
        fontFamily: "Inter, sans-serif",
        color: "#d9d3c8",
      }}
    >
      <div
        style={{
          fontWeight: 300,
          fontSize: 62,
          letterSpacing: "0.62em",
          // Letter-spacing adds trailing space after the last glyph; offset it.
          marginRight: "-0.62em",
          opacity: title,
          transform: `translateY(${(1 - title) * 8}px)`,
        }}
      >
        CHERP
      </div>
      <div
        style={{
          width: 36,
          height: 1,
          background: "#8a857c",
          margin: "26px 0 22px",
          opacity: sub,
        }}
      />
      <div
        style={{
          fontWeight: 400,
          fontSize: 14,
          letterSpacing: "0.58em",
          marginRight: "-0.58em",
          color: "#a39d93",
          opacity: sub,
        }}
      >
        OBJECTS FOR RITUAL
      </div>
    </AbsoluteFill>
  );
};

export const CherpFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0c0c" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows={{ type: THREE.PCFShadowMap }}
        flat
        dpr={1}
        gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
        camera={{ fov: 30, near: 0.5, far: 400, position: [0, 10, 60] }}
      >
        <Scene frame={frame} />
      </ThreeCanvas>
      <Title frame={frame} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: blackAt(frame) }} />
    </AbsoluteFill>
  );
};
