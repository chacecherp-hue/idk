import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { EDGE_RADIUS, LEFT, MIDDLE, RIGHT } from "./dimensions";

// Pockets and slots are cut out of filleted boxes with CSG. Cutters carry a
// small bevel, so the pocket floors have the same softened edges as the
// outside of each casting.

const POCKET_FILLET = 0.1;

const evaluator = new Evaluator();
evaluator.attributes = ["position", "normal"];
evaluator.useGroups = false;

const stripToPositionNormal = (geometry: THREE.BufferGeometry) => {
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== "position" && name !== "normal") {
      geometry.deleteAttribute(name);
    }
  }
  return geometry;
};

// A box with filleted edges, resting on y = 0 and centred in X/Z.
const roundedBox = (w: number, h: number, d: number) => {
  const g = new RoundedBoxGeometry(w, h, d, 5, EDGE_RADIUS);
  g.translate(0, h / 2, 0);
  return stripToPositionNormal(g);
};

// Rounded rectangle outline in the XY plane (Y becomes -Z after the cutter is
// stood up), centred on the origin.
const roundedRectShape = (w: number, d: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  const rr = Math.min(r, w / 2, d / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + d - rr);
  s.absarc(x + w - rr, y + d - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x + rr, y + d);
  s.absarc(x + rr, y + d - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rr);
  s.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return s;
};

const circleShape = (r: number) => {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI * 2, false);
  return s;
};

// A vertical pocket cutter: the outline extruded down from above the top face
// to `depth` below it. `outline` is given at the final opening size.
const pocketCutter = (
  outline: (inset: number) => THREE.Shape,
  depth: number,
  topY: number,
) => {
  const overshoot = 1;
  const g = new THREE.ExtrudeGeometry(outline(POCKET_FILLET), {
    depth: depth + overshoot - POCKET_FILLET * 2,
    bevelEnabled: true,
    bevelThickness: POCKET_FILLET,
    bevelSize: POCKET_FILLET,
    bevelSegments: 4,
    curveSegments: 48,
  });
  // Extrusion runs along +Z; stand it up so it runs along +Y.
  g.rotateX(-Math.PI / 2);
  g.translate(0, topY - depth + POCKET_FILLET, 0);
  return stripToPositionNormal(mergeVertices(g));
};

const subtract = (
  base: THREE.BufferGeometry,
  cutters: { geometry: THREE.BufferGeometry; x: number; z: number }[],
) => {
  let result = new Brush(base);
  result.updateMatrixWorld();
  for (const c of cutters) {
    const brush = new Brush(c.geometry);
    brush.position.set(c.x, 0, c.z);
    brush.updateMatrixWorld();
    result = evaluator.evaluate(result, brush, SUBTRACTION);
    result.updateMatrixWorld();
  }
  const g = result.geometry;
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
};

// Rounded-rect cutter where the outline is shrunk by the bevel inset, so the
// opening ends up at exactly w x d.
const rectCutter = (
  w: number,
  d: number,
  r: number,
  depth: number,
  topY: number,
) =>
  pocketCutter(
    (inset) =>
      roundedRectShape(w - inset * 2, d - inset * 2, Math.max(r - inset, 0.001)),
    depth,
    topY,
  );

export const buildLeftBase = () => {
  const { base, recess } = LEFT;
  return subtract(roundedBox(base.w, base.h, base.d), [
    {
      geometry: rectCutter(recess.w, recess.d, 0.15, recess.depth, base.h),
      x: 0,
      z: 0,
    },
  ]);
};

export const buildLeftBlock = () => {
  const { block } = LEFT;
  const { oval, slot } = block;
  return subtract(roundedBox(block.w, block.h, block.d), [
    {
      geometry: rectCutter(oval.w, oval.d, oval.w / 2, oval.depth, block.h),
      x: oval.x,
      z: oval.z,
    },
    {
      geometry: rectCutter(slot.w, slot.d, slot.r, slot.depth, block.h),
      x: slot.x,
      z: slot.z,
    },
  ]);
};

export const buildMiddleBlock = () => {
  const { lighterHole: lh, stickSlot: ss } = MIDDLE;
  return subtract(roundedBox(MIDDLE.w, MIDDLE.h, MIDDLE.d), [
    {
      geometry: pocketCutter(
        (inset) => circleShape(lh.r - inset),
        lh.depth,
        MIDDLE.h,
      ),
      x: lh.x,
      z: lh.z,
    },
    {
      geometry: rectCutter(ss.w, ss.d, ss.r, ss.depth, MIDDLE.h),
      x: ss.x,
      z: ss.z,
    },
  ]);
};

export const buildTray = () => {
  const { rebate, cavity } = RIGHT;
  return subtract(roundedBox(RIGHT.w, RIGHT.h, RIGHT.d), [
    {
      geometry: rectCutter(rebate.w, rebate.d, 0.2, rebate.depth, RIGHT.h),
      x: 0,
      z: 0,
    },
    {
      geometry: rectCutter(cavity.w, cavity.d, 0.2, cavity.depth, RIGHT.h),
      x: 0,
      z: 0,
    },
  ]);
};

export const buildRoundedBox = roundedBox;
