import { Easing, interpolate } from "remotion";
import * as THREE from "three";

// The film's camera, as a pure function of the frame number.
//
// Five locked-off, motion-controlled moves (no shake, no roll), with long
// focal lengths to keep perspective natural. Shots are joined by short dips
// through black.

export const FPS = 30;
export const DURATION = 450; // 15 s

export const SHOTS = {
  reveal: { from: 0, to: 105 },
  orbit: { from: 105, to: 270 },
  macro: { from: 270, to: 350 },
  hero: { from: 350, to: DURATION },
} as const;

export type CameraState = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  // Distance at which depth-of-field focuses, and how shallow it is (0 = off).
  focus: number;
  bokeh: number;
};

const ease = Easing.bezier(0.45, 0, 0.55, 1);
const easeOut = Easing.bezier(0.2, 0.6, 0.35, 1);

const progress = (
  frame: number,
  shot: { from: number; to: number },
  easing = ease,
) =>
  interpolate(frame, [shot.from, shot.to - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

const lerpV = (a: [number, number, number], b: [number, number, number], t: number) =>
  new THREE.Vector3(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  );

const withFocus = (
  position: THREE.Vector3,
  target: THREE.Vector3,
  fov: number,
  bokeh: number,
): CameraState => ({
  position,
  target,
  fov,
  focus: position.distanceTo(target),
  bokeh,
});

const heroDirection = () => {
  const azimuth = THREE.MathUtils.degToRad(-31);
  const elevation = THREE.MathUtils.degToRad(21);
  return new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  );
};

export const cameraAt = (frame: number): CameraState => {
  if (frame < SHOTS.orbit.from) {
    // Low-angle reveal: from just above the plinth, rising slowly as the light
    // comes up, looking up at the pieces against the lit wall.
    const t = progress(frame, SHOTS.reveal);
    return withFocus(
      lerpV([-8, 0.8, 50], [-4, 3.6, 45], t),
      lerpV([0, 8.2, 0], [0.3, 7.4, 0], t),
      30,
      0,
    );
  }

  if (frame < SHOTS.macro.from) {
    // 180 degree orbit, from one end of the row, across the front, to the other.
    const t = progress(frame, SHOTS.orbit);
    const angle = THREE.MathUtils.degToRad(-92 + 180 * t);
    const radius = 42;
    const height = 13 - 3 * t;
    return withFocus(
      new THREE.Vector3(Math.sin(angle) * radius, height, Math.cos(angle) * radius),
      new THREE.Vector3(0.3, 6, 0),
      30,
      0,
    );
  }

  if (frame < SHOTS.hero.from) {
    // Macro: a slow lateral slide along the top front edge of the middle block,
    // past the lighter, with the incense slot behind it.
    const t = progress(frame, SHOTS.macro);
    return withFocus(
      lerpV([-6.2, 9.4, 12.5], [-2.2, 9.1, 13.2], t),
      lerpV([-1.9, 6.9, 3.4], [-0.6, 6.9, 3.4], t),
      17,
      3.5,
    );
  }

  // Controlled push-in to the centred hero, from the same elevated
  // three-quarter viewpoint as the reference drawing.
  const t = progress(frame, SHOTS.hero, easeOut);
  const target = new THREE.Vector3(0.6, 3.2, 0);
  const dir = heroDirection();
  const distance = 80 - 14 * t;
  return withFocus(target.clone().addScaledVector(dir, distance), target, 30, 0);
};

// Opacity of the black overlay used to dip between shots and open the film.
export const blackAt = (frame: number) => {
  const dips = [SHOTS.orbit.from, SHOTS.macro.from, SHOTS.hero.from];
  let black = interpolate(frame, [0, 24], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  for (const cut of dips) {
    const d = Math.abs(frame - cut + 0.5);
    black = Math.max(black, interpolate(d, [0.5, 5], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }));
  }
  return black;
};
