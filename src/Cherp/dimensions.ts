// Product geometry, measured off the CAD reference (public/reference/cad-reference.png).
// Units are roughly centimetres. X runs along the row of objects (left -> right),
// Y is up, Z points toward the front. Every size and position the product uses
// lives here so the geometry can be tuned against the reference in one place.

export const EDGE_RADIUS = 0.12;

// Left object: square base tray with a shallow recess, and a block seated in it.
export const LEFT = {
  x: -9.9,
  base: { w: 9, d: 9, h: 3 },
  recess: { w: 7.3, d: 7.3, depth: 0.6 },
  block: {
    w: 7,
    d: 7,
    h: 4.4,
    // Rounded-end (stadium) pocket toward -X, and a long rounded slot toward +X,
    // both running front to back.
    oval: { x: -1.8, z: 0.4, w: 1.5, d: 3, depth: 2.5 },
    slot: { x: 1.3, z: -0.1, w: 2.2, d: 4.8, r: 0.3, depth: 3.2 },
  },
};

// Middle object: solid block with a round lighter pocket and an incense slot.
export const MIDDLE = {
  x: 0,
  w: 7,
  d: 7,
  h: 7,
  lighterHole: { x: -1.6, z: 0.3, r: 1.35, depth: 4 },
  stickSlot: { x: 1.5, z: -0.2, w: 1.6, d: 4.4, r: 0.35, depth: 3.5 },
};

// Right object: open tray with an inner rebate around the rim.
export const RIGHT = {
  x: 10.1,
  w: 10,
  d: 8,
  h: 3.6,
  rebate: { w: 8.6, d: 6.6, depth: 0.35 },
  cavity: { w: 7.8, d: 5.8, depth: 2.6 },
};

export const STICK = {
  radius: 0.16,
  length: 13,
  emberLength: 0.32,
  color: "#584b2b",
};

// Four sticks in the middle block, in a row front to back, leaning toward +X.
export const MIDDLE_STICKS = {
  lean: 0.15, // radians
  baseY: MIDDLE.h - 3.2,
  zs: [-1.55, -0.52, 0.52, 1.55],
};

// Single upright stick standing in the right tray. Its tip stands higher than
// the four in the middle block in the reference, so it is longer.
export const TRAY_STICK = { dx: 0.4, z: -1.3, length: 16.5 };

// Mini lighter seated in the round pocket (resting on the pocket floor).
export const LIGHTER = {
  bodyRx: 1.12,
  bodyRz: 0.66,
  bodyH: 5.1,
};
